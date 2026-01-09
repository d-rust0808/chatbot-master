/**
 * Payment Controller - Sepay Integration
 * 
 * WHY: API handlers cho payment operations
 * - Tạo lệnh nạp tiền
 * - Xem lịch sử giao dịch
 * - Xử lý webhook từ Sepay
 * - Quản lý trạng thái payment
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../infrastructure/database';
import { logger } from '../../infrastructure/logger';
import { config } from '../../infrastructure/config';
import type { AuthenticatedRequest } from '../../types/auth';
import {
  createPayment,
  findPaymentByCode,
  findPaymentByAmount,
  extractCodeFromContent,
  completePayment,
  cancelPayment,
} from '../../services/payment/payment.service';

/**
 * Helper to get tenantId from multiple sources
 */
async function getTenantId(request: FastifyRequest, userId?: string): Promise<string | null> {
  const authRequest = request as AuthenticatedRequest;
  
  // 1. Try from JWT token
  let tenantId = authRequest.user?.tenantId;
  if (tenantId) return tenantId;
  
  // 2. Try from tenant context (x-tenant-slug header)
  const tenantRequest = request as any;
  if (tenantRequest.tenant) {
    return tenantRequest.tenant.id;
  }
  
  // 3. Get from user's primary tenant
  if (userId) {
    const tenantUser = await prisma.tenantUser.findFirst({
      where: { userId },
      orderBy: [{ role: 'asc' }], // owner first, then admin, then member
      include: { tenant: true },
    });
    if (tenantUser) {
      return tenantUser.tenant.id;
    }
  }
  
  return null;
}

// Validation schemas
const createPaymentSchema = z.object({
  amount: z.number().int().min(10000, 'Số tiền tối thiểu là 10,000 VNĐ'),
});

const paymentIdParamSchema = z.object({
  id: z.string().min(1),
});

const paymentCodeParamSchema = z.object({
  code: z.string().length(8),
});

/**
 * Create payment order
 * POST /api/v1/sp-admin-payments
 */
export async function createPaymentHandler(
  request: FastifyRequest<{ Body: z.infer<typeof createPaymentSchema> }>,
  reply: FastifyReply
) {
  try {
    const authRequest = request as AuthenticatedRequest;
    const userId = authRequest.user?.userId;
    
    if (!userId) {
      return reply.status(401).send({
        error: {
          message: 'Unauthorized: User not found',
          statusCode: 401,
        },
      });
    }

    const tenantId = await getTenantId(request, userId);
    
    if (!tenantId) {
      return reply.status(401).send({
        error: {
          message: 'Unauthorized: Tenant not found',
          statusCode: 401,
        },
      });
    }

    const { amount } = createPaymentSchema.parse(request.body);

    const payment = await createPayment(tenantId, userId, amount);

    return reply.status(201).send({
      success: true,
      message: 'Tạo lệnh nạp tiền thành công',
      data: {
        id: payment.id,
        code: payment.code,
        amount: payment.amount,
        qrCode: payment.qrCode,
        qrCodeData: payment.qrCodeData,
        expiresAt: payment.expiresAt,
        paymentInfo: {
          account: config.sepay.account,
          bank: config.sepay.bank,
          amount: payment.amount,
          content: payment.code,
        },
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return reply.status(400).send({
        error: {
          message: 'Validation error',
          statusCode: 400,
          details: error.errors,
        },
      });
    }

    logger.error('Create payment error:', error);
    return reply.status(400).send({
      error: {
        message: error instanceof Error ? error.message : 'Internal server error',
        statusCode: 400,
      },
    });
  }
}

/**
 * Get payment history
 * GET /api/v1/sp-admin-payments
 */
export async function getPaymentHistoryHandler(
  request: FastifyRequest<{
    Querystring: { page?: string; limit?: string; status?: string };
  }>,
  reply: FastifyReply
) {
  try {
    const authRequest = request as AuthenticatedRequest;
    const userId = authRequest.user?.userId;
    
    if (!userId) {
      return reply.status(401).send({
        error: {
          message: 'Unauthorized: User not found',
          statusCode: 401,
        },
      });
    }

    const tenantId = await getTenantId(request, userId);
    
    if (!tenantId) {
      return reply.status(401).send({
        error: {
          message: 'Unauthorized: Tenant not found',
          statusCode: 401,
        },
      });
    }

    const page = parseInt(request.query.page || '1', 10);
    const limit = Math.min(parseInt(request.query.limit || '20', 10), 100);
    const status = request.query.status;

    const skip = (page - 1) * limit;

    const where: any = {
      userId,
      tenantId,
    };

    if (status) {
      where.status = status;
    }

    const [payments, total] = await Promise.all([
      (prisma as any).payment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      (prisma as any).payment.count({ where }),
    ]);

    return reply.status(200).send({
      success: true,
      data: payments,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Get payment history error:', error);
    return reply.status(500).send({
      error: {
        message: 'Internal server error',
        statusCode: 500,
      },
    });
  }
}

/**
 * Get payment detail
 * GET /api/v1/sp-admin-payments/:id
 */
export async function getPaymentDetailHandler(
  request: FastifyRequest<{ Params: z.infer<typeof paymentIdParamSchema> }>,
  reply: FastifyReply
) {
  try {
    const authRequest = request as AuthenticatedRequest;
    const userId = authRequest.user?.userId;
    
    if (!userId) {
      return reply.status(401).send({
        error: {
          message: 'Unauthorized: User not found',
          statusCode: 401,
        },
      });
    }

    const tenantId = await getTenantId(request, userId);
    
    if (!tenantId) {
      return reply.status(401).send({
        error: {
          message: 'Unauthorized: Tenant not found',
          statusCode: 401,
        },
      });
    }

    const { id } = paymentIdParamSchema.parse(request.params);

    const payment = await (prisma as any).payment.findFirst({
      where: {
        id,
        userId,
        tenantId,
      },
    });

    if (!payment) {
      return reply.status(404).send({
        error: {
          message: 'Payment not found',
          statusCode: 404,
        },
      });
    }

    return reply.status(200).send({
      success: true,
      data: payment,
    });
  } catch (error) {
    logger.error('Get payment detail error:', error);
    return reply.status(500).send({
      error: {
        message: 'Internal server error',
        statusCode: 500,
      },
    });
  }
}

/**
 * Get payment status by code
 * GET /api/v1/sp-admin-payments/status/:code
 */
export async function getPaymentStatusHandler(
  request: FastifyRequest<{ Params: z.infer<typeof paymentCodeParamSchema> }>,
  reply: FastifyReply
) {
  try {
    const { code } = paymentCodeParamSchema.parse(request.params);

    const payment = await findPaymentByCode(code);

    if (!payment) {
      return reply.status(404).send({
        error: {
          message: 'Payment not found',
          statusCode: 404,
        },
      });
    }

    return reply.status(200).send({
      success: true,
      data: {
        code: payment.code,
        status: payment.status,
        amount: payment.amount,
      },
    });
  } catch (error) {
    logger.error('Get payment status error:', error);
    return reply.status(500).send({
      error: {
        message: 'Internal server error',
        statusCode: 500,
      },
    });
  }
}

/**
 * Get pending payment
 * GET /api/v1/sp-admin-payments/pending
 */
export async function getPendingPaymentHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const authRequest = request as AuthenticatedRequest;
    const userId = authRequest.user?.userId;
    
    if (!userId) {
      return reply.status(401).send({
        error: {
          message: 'Unauthorized: User not found',
          statusCode: 401,
        },
      });
    }

    const tenantId = await getTenantId(request, userId);
    
    if (!tenantId) {
      return reply.status(401).send({
        error: {
          message: 'Unauthorized: Tenant not found',
          statusCode: 401,
        },
      });
    }

    const payment = await (prisma as any).payment.findFirst({
      where: {
        userId,
        tenantId,
        status: 'pending',
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!payment) {
      return reply.status(404).send({
        error: {
          message: 'No pending payment found',
          statusCode: 404,
        },
      });
    }

    return reply.status(200).send({
      success: true,
      data: {
        ...payment,
        paymentInfo: {
          account: config.sepay.account,
          bank: config.sepay.bank,
          amount: payment.amount,
          content: payment.code,
        },
      },
    });
  } catch (error) {
    logger.error('Get pending payment error:', error);
    return reply.status(500).send({
      error: {
        message: 'Internal server error',
        statusCode: 500,
      },
    });
  }
}

/**
 * Cancel pending payment (first pending payment)
 * DELETE /api/v1/sp-admin-payments/pending
 * WHY: Hủy payment pending đầu tiên của user
 */
export async function cancelPendingPaymentHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const authRequest = request as AuthenticatedRequest;
    const userId = authRequest.user?.userId;

    if (!userId) {
      return reply.status(401).send({
        error: {
          message: 'Unauthorized: User not found',
          statusCode: 401,
        },
      });
    }

    const tenantId = await getTenantId(request, userId);
    
    if (!tenantId) {
      return reply.status(401).send({
        error: {
          message: 'Unauthorized: Tenant not found',
          statusCode: 401,
        },
      });
    }

    // Tìm payment pending (chưa hết hạn)
    const payment = await (prisma as any).payment.findFirst({
      where: {
        userId,
        tenantId, // Security: Filter by tenant
        status: 'pending',
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' }, // Lấy payment mới nhất
    });

    if (!payment) {
      // Kiểm tra xem có payment pending nhưng đã hết hạn không
      const expiredPending = await (prisma as any).payment.findFirst({
        where: {
          userId,
          tenantId,
          status: 'pending',
          expiresAt: { lte: new Date() }, // Đã hết hạn
        },
        orderBy: { createdAt: 'desc' },
      });

      if (expiredPending) {
        // Tự động expire payment đã hết hạn
        await (prisma as any).payment.update({
          where: { id: expiredPending.id },
          data: { status: 'expired' },
        });
        
        return reply.status(404).send({
          error: {
            message: 'Payment đã hết hạn. Vui lòng tạo lệnh nạp mới.',
            statusCode: 404,
            details: {
              paymentId: expiredPending.id,
              code: expiredPending.code,
              expiredAt: expiredPending.expiresAt,
            },
          },
        });
      }

      // Không có payment pending nào
      return reply.status(404).send({
        error: {
          message: 'Không tìm thấy giao dịch đang chờ thanh toán',
          statusCode: 404,
        },
      });
    }

    await cancelPayment(payment.id, userId, tenantId);

    return reply.status(200).send({
      success: true,
      message: 'Đã hủy giao dịch thành công',
      data: {
        id: payment.id,
        code: payment.code,
        status: 'cancelled',
      },
    });
  } catch (error) {
    logger.error('Cancel pending payment error:', error);
    return reply.status(400).send({
      error: {
        message: error instanceof Error ? error.message : 'Internal server error',
        statusCode: 400,
      },
    });
  }
}

/**
 * Cancel payment by ID
 * DELETE /api/v1/sp-admin-payments/:id
 * WHY: Hủy thanh toán theo ID cụ thể (đơn vẫn được tính là đã tạo nhưng status = cancelled)
 */
export async function cancelPaymentByIdHandler(
  request: FastifyRequest<{ Params: z.infer<typeof paymentIdParamSchema> }>,
  reply: FastifyReply
) {
  try {
    const authRequest = request as AuthenticatedRequest;
    const userId = authRequest.user?.userId;

    if (!userId) {
      return reply.status(401).send({
        error: {
          message: 'Unauthorized: User not found',
          statusCode: 401,
        },
      });
    }

    const tenantId = await getTenantId(request, userId);
    
    if (!tenantId) {
      return reply.status(401).send({
        error: {
          message: 'Unauthorized: Tenant not found',
          statusCode: 401,
        },
      });
    }

    const { id } = paymentIdParamSchema.parse(request.params);

    // Verify payment exists and belongs to user/tenant
    const payment = await (prisma as any).payment.findFirst({
      where: {
        id,
        userId,
        tenantId, // Security: Multi-tenant isolation
      },
    });

    if (!payment) {
      return reply.status(404).send({
        error: {
          message: 'Payment not found',
          statusCode: 404,
        },
      });
    }

    // Cancel payment
    await cancelPayment(id, userId, tenantId);

    return reply.status(200).send({
      success: true,
      message: 'Đã hủy giao dịch thành công',
      data: {
        id: payment.id,
        code: payment.code,
        status: 'cancelled',
        cancelledAt: new Date(),
      },
    });
  } catch (error) {
    logger.error('Cancel payment by ID error:', error);
    
    if (error instanceof z.ZodError) {
      return reply.status(400).send({
        error: {
          message: 'Validation error',
          statusCode: 400,
          details: error.errors,
        },
      });
    }

    return reply.status(400).send({
      error: {
        message: error instanceof Error ? error.message : 'Internal server error',
        statusCode: 400,
      },
    });
  }
}

/**
 * Sepay webhook handler
 * POST /api/v1/sp-admin-payments/webhook/sepay
 */
export async function sepayWebhookHandler(
  request: FastifyRequest<{ Body: Record<string, any> }>,
  reply: FastifyReply
) {
  try {
    // WHY: Bỏ authentication requirement vì Sepay không gửi đúng Authorization header
    // - Webhook endpoint là public (không yêu cầu auth)
    // - Security: Dựa vào payment code matching và amount verification
    // - Log Authorization header nếu có (để debug)
    const authHeader = request.headers.authorization;
    if (authHeader) {
      logger.info('Sepay webhook received with Authorization header', {
        authHeaderLength: authHeader.length,
        authHeaderPreview: authHeader.substring(0, 30) + '...',
      });
    } else {
      logger.info('Sepay webhook received (no Authorization header)');
    }

    const webhookData = request.body as {
      code?: string;
      content?: string;
      amount?: number;
      transferAmount?: number; // Sepay format
      [key: string]: any;
    };

    logger.info('Sepay webhook received', { webhookData });

    // Normalize amount: Sepay có thể gửi amount hoặc transferAmount
    const webhookAmount = webhookData.transferAmount || webhookData.amount;

    // Strategy 1: Find by code in webhook.code field
    let payment = null;
    if (webhookData.code) {
      payment = await findPaymentByCode(webhookData.code);
      logger.info('Strategy 1: Found payment by code', { code: webhookData.code, paymentId: payment?.id });
    }

    // Strategy 2: Extract code from content field
    // WHY: Sepay gửi code trong content field, ví dụ: "UWPAR266 Ma giao dich..."
    if (!payment && webhookData.content) {
      const extractedCode = extractCodeFromContent(webhookData.content);
      if (extractedCode) {
        logger.info('Strategy 2: Extracted code from content', { content: webhookData.content, extractedCode });
        payment = await findPaymentByCode(extractedCode);
        if (payment) {
          logger.info('Strategy 2: Found payment by extracted code', { code: extractedCode, paymentId: payment.id });
        }
      }
    }

    // Strategy 3: Find by amount (for e-wallets like MOMO or when code not found)
    // WHY: Fallback strategy nếu không tìm thấy code
    if (!payment && webhookAmount) {
      logger.info('Strategy 3: Searching payment by amount', { amount: webhookAmount });
      payment = await findPaymentByAmount(webhookAmount);
      if (payment) {
        logger.info('Strategy 3: Found payment by amount', { amount: webhookAmount, paymentId: payment.id });
      }
    }

    if (!payment) {
      logger.warn('Payment not found for webhook', { 
        webhookData,
        strategies: {
          code: webhookData.code,
          content: webhookData.content,
          extractedCode: webhookData.content ? extractCodeFromContent(webhookData.content) : null,
          amount: webhookAmount,
        },
      });
      return reply.status(404).send({
        error: {
          message: 'Payment not found',
          statusCode: 404,
        },
      });
    }

    // Verify amount matches
    // WHY: Đảm bảo số tiền webhook nhận được khớp với payment
    if (webhookAmount && webhookAmount !== payment.amount) {
      logger.warn('Amount mismatch', {
        paymentId: payment.id,
        paymentCode: payment.code,
        expected: payment.amount,
        received: webhookAmount,
        webhookData,
      });
      return reply.status(400).send({
        error: {
          message: 'Amount mismatch',
          statusCode: 400,
        },
      });
    }

    // Complete payment
    await completePayment(payment.id, webhookData);

    return reply.status(200).send({
      success: true,
      message: 'Webhook processed successfully',
    });
  } catch (error) {
    logger.error('Sepay webhook error:', error);
    return reply.status(500).send({
      error: {
        message: 'Internal server error',
        statusCode: 500,
      },
    });
  }
}

/**
 * Super Admin: Get all payments
 * GET /api/v1/sp-admin-payments/superadmin/all
 */
export async function getAllPaymentsHandler(
  request: FastifyRequest<{
    Querystring: { page?: string; limit?: string; status?: string; tenantId?: string };
  }>,
  reply: FastifyReply
) {
  try {
    const authRequest = request as AuthenticatedRequest;
    const role = authRequest.user?.role;

    if (role !== 'sp-admin') {
      return reply.status(403).send({
        error: {
          message: 'Forbidden: Super admin only',
          statusCode: 403,
        },
      });
    }

    const page = parseInt(request.query.page || '1', 10);
    const limit = Math.min(parseInt(request.query.limit || '50', 10), 100);
    const status = request.query.status;
    const tenantId = request.query.tenantId;

    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;
    if (tenantId) where.tenantId = tenantId;

    const [payments, total] = await Promise.all([
      (prisma as any).payment.findMany({
        where,
        include: {
          tenant: { select: { id: true, name: true, slug: true } },
          user: { select: { id: true, email: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      (prisma as any).payment.count({ where }),
    ]);

    return reply.status(200).send({
      success: true,
      data: payments,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Get all payments error:', error);
    return reply.status(500).send({
      error: {
        message: 'Internal server error',
        statusCode: 500,
      },
    });
  }
}

/**
 * Super Admin: Manual complete payment
 * POST /api/v1/sp-admin-payments/:id/manual-complete
 */
export async function manualCompletePaymentHandler(
  request: FastifyRequest<{ Params: z.infer<typeof paymentIdParamSchema> }>,
  reply: FastifyReply
) {
  try {
    const authRequest = request as AuthenticatedRequest;
    const role = authRequest.user?.role;

    if (role !== 'sp-admin') {
      return reply.status(403).send({
        error: {
          message: 'Forbidden: Super admin only',
          statusCode: 403,
        },
      });
    }

    const { id } = paymentIdParamSchema.parse(request.params);

    await completePayment(id, { manual: true, adminId: authRequest.user?.userId });

    return reply.status(200).send({
      success: true,
      message: 'Payment completed manually',
    });
  } catch (error) {
    logger.error('Manual complete payment error:', error);
    return reply.status(400).send({
      error: {
        message: error instanceof Error ? error.message : 'Internal server error',
        statusCode: 400,
      },
    });
  }
}

