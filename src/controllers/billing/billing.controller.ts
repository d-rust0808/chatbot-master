/**
 * Billing / Credit Controller
 *
 * WHY: Tenant Admin xem thông tin subscription hiện tại, limit và credit wallet.
 * - Get current subscription + plan limits
 * - Get credit wallet balance + recent transactions
 */

import { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../infrastructure/database';
import { logger } from '../../infrastructure/logger';
import type { AuthenticatedRequest } from '../../types/auth';
import { formatSuccessResponse, formatErrorResponse } from '../../utils/response-format';

const tenantParamSchema = z.object({
  tenantId: z.string().min(1),
});

const creditHistoryQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 20)),
});

function getTenantIdFromRequest(request: FastifyRequest): string {
  const paramsResult = tenantParamSchema.safeParse(request.params);
  if (paramsResult.success) {
    return paramsResult.data.tenantId;
  }

  const authRequest = request as AuthenticatedRequest;
  const tenantId = authRequest.user?.tenantId;
  if (!tenantId) {
    throw new Error('Tenant context not found');
  }
  return tenantId;
}

/**
 * WHY: Tenant admin xem subscription & limit hiện tại
 */
export async function getTenantSubscriptionHandler(
  request: FastifyRequest<{
    Params: { tenantId: string };
  }>,
  reply: FastifyReply
) {
  try {
    const tenantId = getTenantIdFromRequest(request);

    const now = new Date();

    const [subscription, planLimit] = await Promise.all([
      prisma.subscription.findFirst({
        where: {
          tenantId,
          status: 'active',
          currentPeriodStart: { lte: now },
          currentPeriodEnd: { gte: now },
        },
        include: {
          planTemplate: true,
        },
      }),
      prisma.tenantPlanLimit.findFirst({
        where: {
          tenantId,
          effectiveFrom: { lte: now },
          OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }],
        },
        orderBy: { effectiveFrom: 'desc' },
      }),
    ]);

    const formattedResponse = formatSuccessResponse(
      {
        subscription,
        planLimit,
      },
      200,
      'Tenant subscription retrieved successfully'
    );
    return reply.status(200).send(formattedResponse);
  } catch (error) {
    logger.error('Get tenant subscription error:', error);
    return reply.status(500).send(
      formatErrorResponse(
        'INTERNAL_ERROR',
        error instanceof Error ? error.message : 'Internal server error',
        500
      )
    );
  }
}

/**
 * WHY: Tenant admin xem credit wallet & lịch sử giao dịch gần đây
 */
export async function getTenantCreditHandler(
  request: FastifyRequest<{
    Params: { tenantId: string };
    Querystring: { limit?: string };
  }>,
  reply: FastifyReply
) {
  try {
    const tenantId = getTenantIdFromRequest(request);
    const validated = creditHistoryQuerySchema.parse(request.query);
    const limit = Math.min(validated.limit || 20, 100);

    const [wallet, transactions] = await Promise.all([
      prisma.creditWallet.findUnique({
        where: { tenantId },
      }),
      prisma.creditTransaction.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
    ]);

    const formattedResponse = formatSuccessResponse(
      {
        wallet,
        transactions,
      },
      200,
      'Tenant credit information retrieved successfully'
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

    logger.error('Get tenant credit error:', error);
    return reply.status(500).send(
      formatErrorResponse(
        'INTERNAL_ERROR',
        error instanceof Error ? error.message : 'Internal server error',
        500
      )
    );
  }
}


