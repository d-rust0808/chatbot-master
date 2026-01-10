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
import { formatAnalyticsResponse, formatSuccessResponse, formatErrorResponse } from '../../utils/response-format';

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

    // WHY: Đảm bảo format response nhất quán với status, message, api_version, provider
    // Overview trả về object với nhiều metrics, không phải data array
    const formattedResponse = formatSuccessResponse(
      result,
      200,
      'Overview metrics retrieved successfully'
    );

    return reply.status(200).send(formattedResponse);
  } catch (error) {
    logger.error('Failed to get overview', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      query: request.query,
    });

    if (error instanceof z.ZodError) {
      return reply.status(400).send(
        formatErrorResponse(
          'VALIDATION_ERROR',
          'Invalid query parameters',
          400,
          error.errors
        )
      );
    }

    return reply.status(500).send(
      formatErrorResponse(
        'INTERNAL_ERROR',
        'Failed to get overview',
        500
      )
    );
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

    // WHY: Đảm bảo format response nhất quán với status, message, data, summary, api_version, provider
    // Service đã trả về { data, summary }, chỉ cần thêm metadata
    const formattedResponse = formatAnalyticsResponse(
      result.data,
      result.summary,
      200,
      'Growth trends retrieved successfully'
    );

    return reply.status(200).send(formattedResponse);
  } catch (error) {
    logger.error('Failed to get growth', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      query: request.query,
    });

    if (error instanceof z.ZodError) {
      return reply.status(400).send(
        formatErrorResponse(
          'VALIDATION_ERROR',
          'Invalid query parameters',
          400,
          error.errors
        )
      );
    }

    return reply.status(500).send(
      formatErrorResponse(
        'INTERNAL_ERROR',
        'Failed to get growth',
        500
      )
    );
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

    // WHY: Đảm bảo format response nhất quán với status, message, api_version, provider
    const formattedResponse = formatSuccessResponse(
      result,
      200,
      'Revenue analytics retrieved successfully'
    );

    return reply.status(200).send(formattedResponse);
  } catch (error) {
    logger.error('Failed to get revenue', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      query: request.query,
    });

    if (error instanceof z.ZodError) {
      return reply.status(400).send(
        formatErrorResponse(
          'VALIDATION_ERROR',
          'Invalid query parameters',
          400,
          error.errors
        )
      );
    }

    return reply.status(500).send(
      formatErrorResponse(
        'INTERNAL_ERROR',
        'Failed to get revenue',
        500
      )
    );
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

    // WHY: Đảm bảo format response nhất quán với status, message, api_version, provider
    const formattedResponse = formatSuccessResponse(
      result,
      200,
      'AI usage analytics retrieved successfully'
    );

    return reply.status(200).send(formattedResponse);
  } catch (error) {
    logger.error('Failed to get AI usage', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      query: request.query,
    });

    if (error instanceof z.ZodError) {
      return reply.status(400).send(
        formatErrorResponse(
          'VALIDATION_ERROR',
          'Invalid query parameters',
          400,
          error.errors
        )
      );
    }

    return reply.status(500).send(
      formatErrorResponse(
        'INTERNAL_ERROR',
        'Failed to get AI usage',
        500
      )
    );
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

    // WHY: Đảm bảo format response nhất quán với status, message, api_version, provider
    const formattedResponse = formatSuccessResponse(
      result,
      200,
      'Platform distribution retrieved successfully'
    );

    return reply.status(200).send(formattedResponse);
  } catch (error) {
    logger.error('Failed to get platforms', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      query: request.query,
    });

    if (error instanceof z.ZodError) {
      return reply.status(400).send(
        formatErrorResponse(
          'VALIDATION_ERROR',
          'Invalid query parameters',
          400,
          error.errors
        )
      );
    }

    return reply.status(500).send(
      formatErrorResponse(
        'INTERNAL_ERROR',
        'Failed to get platforms',
        500
      )
    );
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

    // WHY: Đảm bảo format response nhất quán với status, message, api_version, provider
    const formattedResponse = formatSuccessResponse(
      result,
      200,
      'Top lists retrieved successfully'
    );

    return reply.status(200).send(formattedResponse);
  } catch (error) {
    logger.error('Failed to get top', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      query: request.query,
    });

    if (error instanceof z.ZodError) {
      return reply.status(400).send(
        formatErrorResponse(
          'VALIDATION_ERROR',
          'Invalid query parameters',
          400,
          error.errors
        )
      );
    }

    return reply.status(500).send(
      formatErrorResponse(
        'INTERNAL_ERROR',
        'Failed to get top',
        500
      )
    );
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

    // WHY: Đảm bảo format response nhất quán với status, message, api_version, provider
    const formattedResponse = formatSuccessResponse(
      result,
      200,
      'System health metrics retrieved successfully'
    );

    return reply.status(200).send(formattedResponse);
  } catch (error) {
    logger.error('Failed to get health', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      query: request.query,
    });

    if (error instanceof z.ZodError) {
      return reply.status(400).send(
        formatErrorResponse(
          'VALIDATION_ERROR',
          'Invalid query parameters',
          400,
          error.errors
        )
      );
    }

    return reply.status(500).send(
      formatErrorResponse(
        'INTERNAL_ERROR',
        'Failed to get health',
        500
      )
    );
  }
}

