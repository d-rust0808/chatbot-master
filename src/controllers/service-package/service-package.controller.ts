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
} from '../../services/service-package/service-package.service';
import { logger } from '../../infrastructure/logger';
import type { AuthenticatedRequest } from '../../types/auth';
import { InsufficientCreditsError } from '../../errors/wallet/credit.errors';

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

    return reply.status(200).send({
      success: true,
      data: packages,
    });
  } catch (error) {
    logger.error('Get service packages error:', error);
    return reply.status(500).send({
      error: {
        message: 'Internal server error',
        statusCode: 500,
      },
    });
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
      return reply.status(401).send({
        error: {
          message: 'Unauthorized',
          statusCode: 401,
        },
      });
    }

    const { packageId } = packageIdParamSchema.parse(request.params);
    const { duration } = purchaseServicePackageSchema.parse(request.body);

    const result = await purchaseServicePackage(tenantId, packageId, duration);

    return reply.status(200).send({
      success: true,
      message: `Đã mua gói ${result.packageName} ${result.duration} tháng thành công`,
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

    logger.error('Purchase service package error:', error);
    return reply.status(400).send({
      error: {
        message: error instanceof Error ? error.message : 'Internal server error',
        statusCode: 400,
      },
    });
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
      return reply.status(401).send({
        error: {
          message: 'Unauthorized',
          statusCode: 401,
        },
      });
    }

    const subscriptions = await getTenantSubscriptions(tenantId);

    return reply.status(200).send({
      success: true,
      data: subscriptions,
    });
  } catch (error) {
    logger.error('Get tenant subscriptions error:', error);
    return reply.status(500).send({
      error: {
        message: 'Internal server error',
        statusCode: 500,
      },
    });
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
      return reply.status(401).send({
        error: {
          message: 'Unauthorized',
          statusCode: 401,
        },
      });
    }

    const { subscriptionId } = subscriptionIdParamSchema.parse(request.params);

    await cancelSubscription(tenantId, subscriptionId);

    return reply.status(200).send({
      success: true,
      message: 'Đã hủy đăng ký gói dịch vụ',
    });
  } catch (error) {
    logger.error('Cancel subscription error:', error);
    return reply.status(400).send({
      error: {
        message: error instanceof Error ? error.message : 'Internal server error',
        statusCode: 400,
      },
    });
  }
}

