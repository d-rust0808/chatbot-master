/**
 * Credit Controller
 * 
 * WHY: API handlers cho credit operations
 * - Get balance
 * - Get transaction history
 * - Credit management
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { creditService } from '../../services/wallet/credit.service';
import { vndWalletService } from '../../services/wallet/vnd-wallet.service';
import {
  purchaseCredits,
  purchaseCreditPackage,
  getCreditPackages,
} from '../../services/wallet/credit-purchase.service';
import { logger } from '../../infrastructure/logger';
import type { AuthenticatedRequest } from '../../types/auth';
import { InsufficientCreditsError } from '../../errors/wallet/credit.errors';

// Validation schemas
const getTransactionHistoryQuerySchema = z.object({
  page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
  limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 50)),
  startDate: z.string().datetime().optional().transform((val) => (val ? new Date(val) : undefined)),
  endDate: z.string().datetime().optional().transform((val) => (val ? new Date(val) : undefined)),
});

const purchaseCreditsSchema = z.object({
  vndAmount: z.number().int().min(1000, 'Số tiền tối thiểu là 1,000 VNĐ'),
});

/**
 * Get all balances (VND + Credit)
 * GET /api/v1/credits/balances
 * WHY: Frontend cần get cả VND và Credit balance cùng lúc để hiển thị
 */
export async function getAllBalancesHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const authRequest = request as AuthenticatedRequest;
    const tenantId = authRequest.user?.tenantId;

    if (!tenantId) {
      return reply.status(401).send({
        error: {
          message: 'Unauthorized',
          statusCode: 401,
        },
      });
    }

    const [vndBalance, creditBalance] = await Promise.all([
      vndWalletService.getBalance(tenantId),
      creditService.getBalance(tenantId),
    ]);

    return reply.status(200).send({
      success: true,
      data: {
        balances: {
          vnd: vndBalance,
          credit: creditBalance,
        },
        tenantId,
      },
    });
  } catch (error) {
    logger.error('Get all balances error:', error);
    return reply.status(500).send({
      error: {
        message: 'Internal server error',
        statusCode: 500,
      },
    });
  }
}

/**
 * Get credit balance
 * GET /api/v1/credits/balance
 */
export async function getBalanceHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const authRequest = request as AuthenticatedRequest;
    const tenantId = authRequest.user?.tenantId;

    if (!tenantId) {
      return reply.status(401).send({
        error: {
          message: 'Unauthorized',
          statusCode: 401,
        },
      });
    }

    const balance = await creditService.getBalance(tenantId);

    return reply.status(200).send({
      success: true,
      data: {
        balance,
        currency: 'CREDIT',
        tenantId,
      },
    });
  } catch (error) {
    logger.error('Get balance error:', error);
    return reply.status(500).send({
      error: {
        message: 'Internal server error',
        statusCode: 500,
      },
    });
  }
}

/**
 * Get credit transaction history
 * GET /api/v1/credits/transactions
 */
export async function getTransactionHistoryHandler(
  request: FastifyRequest<{
    Querystring: z.infer<typeof getTransactionHistoryQuerySchema>;
  }>,
  reply: FastifyReply
) {
  try {
    const authRequest = request as AuthenticatedRequest;
    const tenantId = authRequest.user?.tenantId;

    if (!tenantId) {
      return reply.status(401).send({
        error: {
          message: 'Unauthorized',
          statusCode: 401,
        },
      });
    }

    const query = getTransactionHistoryQuerySchema.parse(request.query);
    const result = await creditService.getTransactionHistory(tenantId, {
      page: query.page,
      limit: query.limit,
      startDate: query.startDate,
      endDate: query.endDate,
    });

    return reply.status(200).send({
      success: true,
      data: result.transactions,
      meta: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
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

    logger.error('Get transaction history error:', error);
    return reply.status(500).send({
      error: {
        message: 'Internal server error',
        statusCode: 500,
      },
    });
  }
}

/**
 * Get VND balance
 * GET /api/v1/credits/vnd-balance
 */
export async function getVNDBalanceHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const authRequest = request as AuthenticatedRequest;
    const tenantId = authRequest.user?.tenantId;

    if (!tenantId) {
      return reply.status(401).send({
        error: {
          message: 'Unauthorized',
          statusCode: 401,
        },
      });
    }

    const balance = await vndWalletService.getBalance(tenantId);

    return reply.status(200).send({
      success: true,
      data: {
        balance,
        currency: 'VND',
        tenantId,
      },
    });
  } catch (error) {
    logger.error('Get VND balance error:', error);
    return reply.status(500).send({
      error: {
        message: 'Internal server error',
        statusCode: 500,
      },
    });
  }
}

/**
 * Purchase credits from VND wallet
 * POST /api/v1/credits/purchase
 */
export async function purchaseCreditsHandler(
  request: FastifyRequest<{
    Body: z.infer<typeof purchaseCreditsSchema>;
  }>,
  reply: FastifyReply
) {
  try {
    const authRequest = request as AuthenticatedRequest;
    const tenantId = authRequest.user?.tenantId;

    if (!tenantId) {
      return reply.status(401).send({
        error: {
          message: 'Unauthorized',
          statusCode: 401,
        },
      });
    }

    const { vndAmount } = purchaseCreditsSchema.parse(request.body);

    const result = await purchaseCredits(tenantId, vndAmount);

    return reply.status(200).send({
      success: true,
      message: `Đã mua ${result.creditAmount.toLocaleString('vi-VN')} credits`,
      data: result,
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

    if (error instanceof InsufficientCreditsError) {
      return reply.status(400).send({
        error: {
          message: error.message,
          statusCode: 400,
          code: 'INSUFFICIENT_VND_BALANCE',
        },
      });
    }

    logger.error('Purchase credits error:', error);
    return reply.status(500).send({
      error: {
        message: 'Internal server error',
        statusCode: 500,
      },
    });
  }
}

/**
 * Get credit packages
 * GET /api/v1/credits/packages
 */
export async function getCreditPackagesHandler(
  _request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const packages = await getCreditPackages();

    return reply.status(200).send({
      success: true,
      data: packages,
    });
  } catch (error) {
    logger.error('Get credit packages error:', error);
    return reply.status(500).send({
      error: {
        message: 'Internal server error',
        statusCode: 500,
      },
    });
  }
}

/**
 * Purchase credit package
 * POST /api/v1/credits/packages/:packageId/purchase
 */
export async function purchaseCreditPackageHandler(
  request: FastifyRequest<{
    Params: { packageId: string };
  }>,
  reply: FastifyReply
) {
  try {
    const authRequest = request as AuthenticatedRequest;
    const tenantId = authRequest.user?.tenantId;

    if (!tenantId) {
      return reply.status(401).send({
        error: {
          message: 'Unauthorized',
          statusCode: 401,
        },
      });
    }

    const { packageId } = request.params;

    const result = await purchaseCreditPackage(tenantId, packageId);

    return reply.status(200).send({
      success: true,
      message: `Đã mua gói ${result.packageName}: ${result.totalCredits.toLocaleString('vi-VN')} credits`,
      data: result,
    });
  } catch (error) {
    if (error instanceof InsufficientCreditsError) {
      return reply.status(400).send({
        error: {
          message: error.message,
          statusCode: 400,
          code: 'INSUFFICIENT_VND_BALANCE',
        },
      });
    }

    logger.error('Purchase credit package error:', error);
    return reply.status(400).send({
      error: {
        message: error instanceof Error ? error.message : 'Internal server error',
        statusCode: 400,
      },
    });
  }
}

/**
 * Get VND transaction history
 * GET /api/v1/credits/vnd-transactions
 */
export async function getVNDTransactionHistoryHandler(
  request: FastifyRequest<{
    Querystring: z.infer<typeof getTransactionHistoryQuerySchema>;
  }>,
  reply: FastifyReply
) {
  try {
    const authRequest = request as AuthenticatedRequest;
    const tenantId = authRequest.user?.tenantId;

    if (!tenantId) {
      return reply.status(401).send({
        error: {
          message: 'Unauthorized',
          statusCode: 401,
        },
      });
    }

    const query = getTransactionHistoryQuerySchema.parse(request.query);
    const result = await vndWalletService.getTransactionHistory(tenantId, {
      page: query.page,
      limit: query.limit,
      startDate: query.startDate,
      endDate: query.endDate,
    });

    return reply.status(200).send({
      success: true,
      data: result.transactions,
      meta: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
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

    logger.error('Get VND transaction history error:', error);
    return reply.status(500).send({
      error: {
        message: 'Internal server error',
        statusCode: 500,
      },
    });
  }
}

