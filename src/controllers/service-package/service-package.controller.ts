/**
 * Service Package Controller
 * 
 * WHY: API handlers cho service package operations
 * - Get available packages
 * - Purchase packages
 * - Manage subscriptions
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import {
  getServicePackages,
  purchaseServicePackage,
  getTenantSubscriptions,
  cancelSubscription,
  getActiveSubscriptionsForSidebar,
  checkServiceActive,
  createServicePackage,
  getAllServicePackagesAdmin,
  getServicePackageByIdAdmin,
  updateServicePackage,
  deleteServicePackage,
} from '../../services/service-package/service-package.service';
import { logger } from '../../infrastructure/logger';
import type { AuthenticatedRequest } from '../../types/auth';
import { InsufficientCreditsError } from '../../errors/wallet/credit.errors';
import { formatSuccessResponse, formatErrorResponse } from '../../utils/response-format';

const packageIdParamSchema = z.object({
  packageId: z.string().min(1),
});

const purchaseServicePackageSchema = z.object({
  duration: z.number().int().min(1, 'Tối thiểu 1 tháng'),
});

const subscriptionIdParamSchema = z.object({
  subscriptionId: z.string().min(1),
});

/**
 * Get service packages
 * GET /api/v1/service-packages?service=whatsapp
 */
export async function getServicePackagesHandler(
  request: FastifyRequest<{
    Querystring: { service?: string };
  }>,
  reply: FastifyReply
) {
  try {
    const service = request.query.service;
    const packages = await getServicePackages(service);

    const formattedResponse = formatSuccessResponse(
      packages,
      200,
      'Service packages retrieved successfully'
    );
    return reply.status(200).send(formattedResponse);
  } catch (error) {
    logger.error('Get service packages error:', error);
    return reply.status(500).send(
      formatErrorResponse(
        'INTERNAL_ERROR',
        'Internal server error',
        500
      )
    );
  }
}

/**
 * Purchase service package
 * POST /api/v1/service-packages/:packageId/purchase
 * Body: { duration: 1-5 } // Số tháng
 */
export async function purchaseServicePackageHandler(
  request: FastifyRequest<{
    Params: z.infer<typeof packageIdParamSchema>;
    Body: z.infer<typeof purchaseServicePackageSchema>;
  }>,
  reply: FastifyReply
) {
  try {
    const authRequest = request as AuthenticatedRequest;
    const tenantId = authRequest.user?.tenantId;

    if (!tenantId) {
      return reply.status(401).send(
        formatErrorResponse(
          'AUTH_ERROR',
          'Unauthorized',
          401
        )
      );
    }

    const { packageId } = packageIdParamSchema.parse(request.params);
    const { duration } = purchaseServicePackageSchema.parse(request.body);

    const result = await purchaseServicePackage(tenantId, packageId, duration);

    const formattedResponse = formatSuccessResponse(
      result,
      200,
      `Đã mua gói ${result.packageName} ${result.duration} tháng thành công`
    );
    return reply.status(200).send(formattedResponse);
  } catch (error) {
    if (error instanceof InsufficientCreditsError) {
      return reply.status(400).send(
        formatErrorResponse(
          'INSUFFICIENT_VND_BALANCE',
          error.message,
          400
        )
      );
    }

    logger.error('Purchase service package error:', error);
    return reply.status(400).send(
      formatErrorResponse(
        'INTERNAL_ERROR',
        error instanceof Error ? error.message : 'Internal server error',
        400
      )
    );
  }
}

/**
 * Get tenant subscriptions
 * GET /api/v1/service-packages/subscriptions
 */
export async function getTenantSubscriptionsHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const authRequest = request as AuthenticatedRequest;
    const tenantId = authRequest.user?.tenantId;

    if (!tenantId) {
      return reply.status(401).send(
        formatErrorResponse(
          'AUTH_ERROR',
          'Unauthorized',
          401
        )
      );
    }

    const subscriptions = await getTenantSubscriptions(tenantId);

    const formattedResponse = formatSuccessResponse(
      subscriptions,
      200,
      'Tenant subscriptions retrieved successfully'
    );
    return reply.status(200).send(formattedResponse);
  } catch (error) {
    logger.error('Get tenant subscriptions error:', error);
    return reply.status(500).send(
      formatErrorResponse(
        'INTERNAL_ERROR',
        'Internal server error',
        500
      )
    );
  }
}

/**
 * Get active subscriptions for sidebar
 * GET /api/v1/service-packages/my-subscriptions
 * WHY: API tối ưu cho sidebar - chỉ lấy thông tin cần thiết
 */
export async function getMyActiveSubscriptionsHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const authRequest = request as AuthenticatedRequest;
    const tenantId = authRequest.user?.tenantId;

    if (!tenantId) {
      return reply.status(401).send(
        formatErrorResponse(
          'AUTH_ERROR',
          'Unauthorized',
          401
        )
      );
    }

    const subscriptions = await getActiveSubscriptionsForSidebar(tenantId);

    const formattedResponse = formatSuccessResponse(
      subscriptions,
      200,
      'Active subscriptions retrieved successfully'
    );
    return reply.status(200).send(formattedResponse);
  } catch (error) {
    logger.error('Get active subscriptions for sidebar error:', error);
    return reply.status(500).send(
      formatErrorResponse(
        'INTERNAL_ERROR',
        'Internal server error',
        500
      )
    );
  }
}

/**
 * Check if service is active
 * GET /api/v1/service-packages/check/:service
 * WHY: Kiểm tra nhanh xem service có đang active không
 */
export async function checkServiceActiveHandler(
  request: FastifyRequest<{
    Params: { service: string };
  }>,
  reply: FastifyReply
) {
  try {
    const authRequest = request as AuthenticatedRequest;
    const tenantId = authRequest.user?.tenantId;

    if (!tenantId) {
      return reply.status(401).send(
        formatErrorResponse(
          'AUTH_ERROR',
          'Unauthorized',
          401
        )
      );
    }

    const { service } = request.params;
    const result = await checkServiceActive(tenantId, service);

    const formattedResponse = formatSuccessResponse(
      result,
      200,
      'Service status checked successfully'
    );
    return reply.status(200).send(formattedResponse);
  } catch (error) {
    logger.error('Check service active error:', error);
    return reply.status(500).send(
      formatErrorResponse(
        'INTERNAL_ERROR',
        'Internal server error',
        500
      )
    );
  }
}

/**
 * Cancel subscription
 * POST /api/v1/service-packages/subscriptions/:subscriptionId/cancel
 */
export async function cancelSubscriptionHandler(
  request: FastifyRequest<{
    Params: z.infer<typeof subscriptionIdParamSchema>;
  }>,
  reply: FastifyReply
) {
  try {
    const authRequest = request as AuthenticatedRequest;
    const tenantId = authRequest.user?.tenantId;

    if (!tenantId) {
      return reply.status(401).send(
        formatErrorResponse(
          'AUTH_ERROR',
          'Unauthorized',
          401
        )
      );
    }

    const { subscriptionId } = subscriptionIdParamSchema.parse(request.params);

    await cancelSubscription(tenantId, subscriptionId);

    const formattedResponse = formatSuccessResponse(
      null,
      200,
      'Đã hủy đăng ký gói dịch vụ'
    );
    return reply.status(200).send(formattedResponse);
  } catch (error) {
    logger.error('Cancel subscription error:', error);
    return reply.status(400).send(
      formatErrorResponse(
        'INTERNAL_ERROR',
        error instanceof Error ? error.message : 'Internal server error',
        400
      )
    );
  }
}

// ==================== Admin Controllers ====================

const createServicePackageSchema = z.object({
  name: z.string().min(1, 'Tên dịch vụ là bắt buộc'),
  description: z.string().optional(),
  service: z.enum(['whatsapp', 'facebook', 'instagram', 'tiktok', 'zalo', 'messenger'], {
    errorMap: () => ({ message: 'Service không hợp lệ' }),
  }),
  pricePerMonth: z.number().int().min(1, 'Giá phải lớn hơn 0'),
  minDuration: z.number().int().min(1).optional().default(1),
  imageUrl: z.string().url().optional(),
  features: z.any().optional(),
  isActive: z.boolean().optional().default(true),
  sortOrder: z.number().int().optional().default(0),
});

const updateServicePackageSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  service: z.enum(['whatsapp', 'facebook', 'instagram', 'tiktok', 'zalo', 'messenger']).optional(),
  pricePerMonth: z.number().int().min(1).optional(),
  minDuration: z.number().int().min(1).optional(),
  imageUrl: z.string().url().optional(),
  features: z.any().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

/**
 * Create service package (Super Admin only)
 * POST /api/v1/admin/service-packages
 */
export async function createServicePackageHandler(
  request: FastifyRequest<{
    Body: z.infer<typeof createServicePackageSchema>;
  }>,
  reply: FastifyReply
) {
  try {
    const validatedData = createServicePackageSchema.parse(request.body);
    const result = await createServicePackage(validatedData);

    const formattedResponse = formatSuccessResponse(
      result,
      201,
      'Đã tạo gói dịch vụ thành công'
    );
    return reply.status(201).send(formattedResponse);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return reply.status(400).send(
        formatErrorResponse(
          'VALIDATION_ERROR',
          'Validation error',
          400,
          error.errors
        )
      );
    }

    logger.error('Create service package error:', error);
    return reply.status(400).send(
      formatErrorResponse(
        'INTERNAL_ERROR',
        error instanceof Error ? error.message : 'Internal server error',
        400
      )
    );
  }
}

/**
 * Get all service packages (Admin view)
 * GET /api/v1/admin/service-packages?service=whatsapp&isActive=true
 */
export async function getAllServicePackagesAdminHandler(
  request: FastifyRequest<{
    Querystring: { service?: string; isActive?: string };
  }>,
  reply: FastifyReply
) {
  try {
    const filters: any = {};
    if (request.query.service) {
      filters.service = request.query.service;
    }
    if (request.query.isActive !== undefined) {
      filters.isActive = request.query.isActive === 'true';
    }

    const packages = await getAllServicePackagesAdmin(filters);

    const formattedResponse = formatSuccessResponse(
      packages,
      200,
      'Service packages retrieved successfully'
    );
    return reply.status(200).send(formattedResponse);
  } catch (error) {
    logger.error('Get all service packages admin error:', error);
    return reply.status(500).send(
      formatErrorResponse(
        'INTERNAL_ERROR',
        'Internal server error',
        500
      )
    );
  }
}

/**
 * Get service package by ID (Admin)
 * GET /api/v1/admin/service-packages/:id
 */
export async function getServicePackageByIdAdminHandler(
  request: FastifyRequest<{
    Params: { id: string };
  }>,
  reply: FastifyReply
) {
  try {
    const { id } = request.params;
    const servicePackage = await getServicePackageByIdAdmin(id);

    const formattedResponse = formatSuccessResponse(
      servicePackage,
      200,
      'Service package retrieved successfully'
    );
    return reply.status(200).send(formattedResponse);
  } catch (error) {
    logger.error('Get service package by ID admin error:', error);
    return reply.status(404).send(
      formatErrorResponse(
        'NOT_FOUND_ERROR',
        error instanceof Error ? error.message : 'Service package not found',
        404
      )
    );
  }
}

/**
 * Update service package (Super Admin only)
 * PUT /api/v1/admin/service-packages/:id
 */
export async function updateServicePackageHandler(
  request: FastifyRequest<{
    Params: { id: string };
    Body: z.infer<typeof updateServicePackageSchema>;
  }>,
  reply: FastifyReply
) {
  try {
    const { id } = request.params;
    const validatedData = updateServicePackageSchema.parse(request.body);
    const result = await updateServicePackage(id, validatedData);

    const formattedResponse = formatSuccessResponse(
      result,
      200,
      'Đã cập nhật gói dịch vụ thành công'
    );
    return reply.status(200).send(formattedResponse);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return reply.status(400).send(
        formatErrorResponse(
          'VALIDATION_ERROR',
          'Validation error',
          400,
          error.errors
        )
      );
    }

    logger.error('Update service package error:', error);
    return reply.status(400).send(
      formatErrorResponse(
        'INTERNAL_ERROR',
        error instanceof Error ? error.message : 'Internal server error',
        400
      )
    );
  }
}

/**
 * Delete service package (Soft delete - Super Admin only)
 * DELETE /api/v1/admin/service-packages/:id
 */
export async function deleteServicePackageHandler(
  request: FastifyRequest<{
    Params: { id: string };
  }>,
  reply: FastifyReply
) {
  try {
    const { id } = request.params;
    await deleteServicePackage(id);

    const formattedResponse = formatSuccessResponse(
      null,
      200,
      'Đã xóa gói dịch vụ thành công'
    );
    return reply.status(200).send(formattedResponse);
  } catch (error) {
    logger.error('Delete service package error:', error);
    return reply.status(400).send(
      formatErrorResponse(
        'INTERNAL_ERROR',
        error instanceof Error ? error.message : 'Internal server error',
        400
      )
    );
  }
}

