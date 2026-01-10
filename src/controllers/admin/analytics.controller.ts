/**
 * Analytics Controller (SP-Admin only)
 * 
 * WHY: API handlers cho SP-Admin analytics dashboard
 * - Overview metrics
 * - Growth trends
 * - Revenue analytics
 * - AI usage analytics
 * - Platform distribution
 * - Top lists
 * - System health
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { analyticsService } from '../../services/analytics/analytics.service';
import { logger } from '../../infrastructure/logger';

/**
 * Get overview query schema
 */
const getOverviewSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  period: z.enum(['day', 'week', 'month']).default('month'),
  compareWithPrevious: z.string().transform((val) => val === 'true').pipe(z.boolean()).optional(),
});

/**
 * Get growth query schema
 */
const getGrowthSchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  metric: z.enum(['users', 'tenants', 'revenue', 'ai_requests', 'tokens']),
  interval: z.enum(['hour', 'day', 'week', 'month']).default('day'),
});

/**
 * Get revenue query schema
 */
const getRevenueSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  groupBy: z.enum(['day', 'week', 'month', 'tenant']).default('day'),
  limit: z.string().transform(Number).pipe(z.number().int().positive().max(100)).default('10'),
});

/**
 * Get AI usage query schema
 */
const getAIUsageSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  groupBy: z.enum(['provider', 'model', 'hour', 'day']).default('provider'),
  tenantId: z.string().optional(),
});

/**
 * Get platforms query schema
 */
const getPlatformsSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  metric: z.enum(['conversations', 'messages', 'active_users']).optional(),
});

/**
 * Get top query schema
 */
const getTopSchema = z.object({
  type: z.enum(['tenants', 'users', 'chatbots']),
  metric: z.enum(['revenue', 'ai_requests', 'conversations', 'messages', 'credit_spent']),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.string().transform(Number).pipe(z.number().int().positive().max(100)).default('10'),
});

/**
 * Get health query schema
 */
const getHealthSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  interval: z.enum(['hour', 'day']).default('hour'),
});

/**
 * Get overview metrics
 * GET /sp-admin/analytics/overview
 */
export async function getOverviewHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const query = getOverviewSchema.parse(request.query);

    const result = await analyticsService.getOverview({
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      period: query.period,
      compareWithPrevious: query.compareWithPrevious,
    });

    return reply.status(200).send(result);
  } catch (error) {
    logger.error('Failed to get overview', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      query: request.query,
    });

    if (error instanceof z.ZodError) {
      return reply.status(400).send({
        error: {
          message: 'Invalid query parameters',
          details: error.errors,
        },
      });
    }

    return reply.status(500).send({
      error: {
        message: 'Failed to get overview',
      },
    });
  }
}

/**
 * Get growth trends
 * GET /sp-admin/analytics/growth
 */
export async function getGrowthHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const query = getGrowthSchema.parse(request.query);

    const result = await analyticsService.getGrowth({
      startDate: new Date(query.startDate),
      endDate: new Date(query.endDate),
      metric: query.metric,
      interval: query.interval,
    });

    return reply.status(200).send(result);
  } catch (error) {
    logger.error('Failed to get growth', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      query: request.query,
    });

    if (error instanceof z.ZodError) {
      return reply.status(400).send({
        error: {
          message: 'Invalid query parameters',
          details: error.errors,
        },
      });
    }

    return reply.status(500).send({
      error: {
        message: 'Failed to get growth',
      },
    });
  }
}

/**
 * Get revenue analytics
 * GET /sp-admin/analytics/revenue
 */
export async function getRevenueHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const query = getRevenueSchema.parse(request.query);

    const result = await analyticsService.getRevenue({
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      groupBy: query.groupBy,
      limit: query.limit,
    });

    return reply.status(200).send(result);
  } catch (error) {
    logger.error('Failed to get revenue', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      query: request.query,
    });

    if (error instanceof z.ZodError) {
      return reply.status(400).send({
        error: {
          message: 'Invalid query parameters',
          details: error.errors,
        },
      });
    }

    return reply.status(500).send({
      error: {
        message: 'Failed to get revenue',
      },
    });
  }
}

/**
 * Get AI usage analytics
 * GET /sp-admin/analytics/ai-usage
 */
export async function getAIUsageHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const query = getAIUsageSchema.parse(request.query);

    const result = await analyticsService.getAIUsage({
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      groupBy: query.groupBy,
      tenantId: query.tenantId,
    });

    return reply.status(200).send(result);
  } catch (error) {
    logger.error('Failed to get AI usage', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      query: request.query,
    });

    if (error instanceof z.ZodError) {
      return reply.status(400).send({
        error: {
          message: 'Invalid query parameters',
          details: error.errors,
        },
      });
    }

    return reply.status(500).send({
      error: {
        message: 'Failed to get AI usage',
      },
    });
  }
}

/**
 * Get platform distribution
 * GET /sp-admin/analytics/platforms
 */
export async function getPlatformsHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const query = getPlatformsSchema.parse(request.query);

    const result = await analyticsService.getPlatforms({
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      metric: query.metric,
    });

    return reply.status(200).send(result);
  } catch (error) {
    logger.error('Failed to get platforms', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      query: request.query,
    });

    if (error instanceof z.ZodError) {
      return reply.status(400).send({
        error: {
          message: 'Invalid query parameters',
          details: error.errors,
        },
      });
    }

    return reply.status(500).send({
      error: {
        message: 'Failed to get platforms',
      },
    });
  }
}

/**
 * Get top lists
 * GET /sp-admin/analytics/top
 */
export async function getTopHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const query = getTopSchema.parse(request.query);

    const result = await analyticsService.getTop({
      type: query.type,
      metric: query.metric,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      limit: query.limit,
    });

    return reply.status(200).send(result);
  } catch (error) {
    logger.error('Failed to get top', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      query: request.query,
    });

    if (error instanceof z.ZodError) {
      return reply.status(400).send({
        error: {
          message: 'Invalid query parameters',
          details: error.errors,
        },
      });
    }

    return reply.status(500).send({
      error: {
        message: 'Failed to get top',
      },
    });
  }
}

/**
 * Get system health
 * GET /sp-admin/analytics/health
 */
export async function getHealthHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const query = getHealthSchema.parse(request.query);

    const result = await analyticsService.getHealth({
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      interval: query.interval,
    });

    return reply.status(200).send(result);
  } catch (error) {
    logger.error('Failed to get health', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      query: request.query,
    });

    if (error instanceof z.ZodError) {
      return reply.status(400).send({
        error: {
          message: 'Invalid query parameters',
          details: error.errors,
        },
      });
    }

    return reply.status(500).send({
      error: {
        message: 'Failed to get health',
      },
    });
  }
}

