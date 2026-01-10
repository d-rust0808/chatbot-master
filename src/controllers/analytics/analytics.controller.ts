/**
 * Analytics Controller
 * 
 * WHY: Analytics endpoints cho dashboard
 * - Message statistics
 * - Conversation statistics
 * - Platform breakdown
 * - Response time metrics
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../infrastructure/database';
import { logger } from '../../infrastructure/logger';
import { requireTenant } from '../../middleware/tenant';
import { formatSuccessResponse, formatErrorResponse } from '../../utils/response-format';

// Validation schemas
const analyticsQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  chatbotId: z.string().optional(),
  platform: z.string().optional(),
  period: z.enum(['day', 'week', 'month']).optional().default('day'),
});

/**
 * Get message statistics
 */
export async function getMessageStatsHandler(
  request: FastifyRequest<{
    Querystring: {
      startDate?: string;
      endDate?: string;
      chatbotId?: string;
      platform?: string;
      period?: 'day' | 'week' | 'month';
    };
  }>,
  reply: FastifyReply
) {
  try {
    const tenant = requireTenant(request);
    const validated = analyticsQuerySchema.parse(request.query);

    const startDate = validated.startDate
      ? new Date(validated.startDate)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default: last 30 days
    const endDate = validated.endDate ? new Date(validated.endDate) : new Date();

    // Build where clause
    const where: any = {
      conversation: {
        tenantId: tenant.id,
      },
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (validated.chatbotId) {
      where.conversation.chatbotId = validated.chatbotId;
    }

    if (validated.platform) {
      where.platform = validated.platform;
    }

    // Get message counts by period
    const messages = await prisma.message.findMany({
      where,
      select: {
        createdAt: true,
        direction: true,
        platform: true,
      },
    });

    // Group by period
    const stats = groupByPeriod(messages, validated.period, startDate, endDate);

    // Calculate totals
    const totalMessages = messages.length;
    const incomingMessages = messages.filter((m) => m.direction === 'incoming').length;
    const outgoingMessages = messages.filter((m) => m.direction === 'outgoing').length;

    // Platform breakdown
    const platformBreakdown = messages.reduce((acc, msg) => {
      acc[msg.platform] = (acc[msg.platform] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const formattedResponse = formatSuccessResponse(
      {
        period: validated.period,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        totals: {
          total: totalMessages,
          incoming: incomingMessages,
          outgoing: outgoingMessages,
        },
        timeline: stats,
        platformBreakdown,
      },
      200,
      'Message statistics retrieved successfully'
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

    logger.error('Get message stats error:', error);
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
 * Get conversation statistics
 */
export async function getConversationStatsHandler(
  request: FastifyRequest<{
    Querystring: {
      startDate?: string;
      endDate?: string;
      chatbotId?: string;
    };
  }>,
  reply: FastifyReply
) {
  try {
    const tenant = requireTenant(request);
    const validated = analyticsQuerySchema.parse(request.query);

    const startDate = validated.startDate
      ? new Date(validated.startDate)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = validated.endDate ? new Date(validated.endDate) : new Date();

    const where: any = {
      tenantId: tenant.id,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (validated.chatbotId) {
      where.chatbotId = validated.chatbotId;
    }

    // Get conversations
    const conversations = await prisma.conversation.findMany({
      where,
      include: {
        _count: {
          select: {
            messages: true,
          },
        },
      },
    });

    // Calculate stats
    const totalConversations = conversations.length;
    const activeConversations = conversations.filter((c) => c.status === 'active').length;
    const closedConversations = conversations.filter((c) => c.status === 'closed').length;

    // Average messages per conversation
    const totalMessages = conversations.reduce((sum, c) => sum + c._count.messages, 0);
    const avgMessagesPerConversation =
      totalConversations > 0 ? totalMessages / totalConversations : 0;

    // Platform breakdown
    const platformBreakdown = conversations.reduce((acc, conv) => {
      acc[conv.platform] = (acc[conv.platform] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const formattedResponse = formatSuccessResponse(
      {
        totals: {
          total: totalConversations,
          active: activeConversations,
          closed: closedConversations,
        },
        averages: {
          messagesPerConversation: Math.round(avgMessagesPerConversation * 100) / 100,
        },
        platformBreakdown,
      },
      200,
      'Conversation statistics retrieved successfully'
    );
    return reply.status(200).send(formattedResponse);
  } catch (error) {
    logger.error('Get conversation stats error:', error);
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
 * Get response time metrics
 */
export async function getResponseTimeStatsHandler(
  request: FastifyRequest<{
    Querystring: {
      startDate?: string;
      endDate?: string;
      chatbotId?: string;
    };
  }>,
  reply: FastifyReply
) {
  try {
    const tenant = requireTenant(request);
    const validated = analyticsQuerySchema.parse(request.query);

    const startDate = validated.startDate
      ? new Date(validated.startDate)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = validated.endDate ? new Date(validated.endDate) : new Date();

    const where: any = {
      conversation: {
        tenantId: tenant.id,
      },
      direction: 'outgoing',
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (validated.chatbotId) {
      where.conversation.chatbotId = validated.chatbotId;
    }

    // Get outgoing messages with metadata (response time)
    const messages = await prisma.message.findMany({
      where,
      select: {
        createdAt: true,
        metadata: true,
      },
    });

    // Calculate response times (if stored in metadata)
    const responseTimes = messages
      .map((msg) => {
        const metadata = msg.metadata as any;
        return metadata?.responseTime || null;
      })
      .filter((rt): rt is number => rt !== null);

    const avgResponseTime =
      responseTimes.length > 0
        ? responseTimes.reduce((sum, rt) => sum + rt, 0) / responseTimes.length
        : 0;

    const formattedResponse = formatSuccessResponse(
      {
        averageResponseTime: Math.round(avgResponseTime * 100) / 100, // ms
        totalResponses: messages.length,
        responsesWithTimeData: responseTimes.length,
      },
      200,
      'Response time statistics retrieved successfully'
    );
    return reply.status(200).send(formattedResponse);
  } catch (error) {
    logger.error('Get response time stats error:', error);
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
 * Group messages by period
 */
function groupByPeriod(
  messages: Array<{ createdAt: Date }>,
  period: 'day' | 'week' | 'month',
  _startDate: Date,
  _endDate: Date
): Array<{ date: string; count: number }> {
  const groups: Record<string, number> = {};

  for (const msg of messages) {
    const date = new Date(msg.createdAt);
    let key: string;

    if (period === 'day') {
      key = date.toISOString().split('T')[0]; // YYYY-MM-DD
    } else if (period === 'week') {
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      key = weekStart.toISOString().split('T')[0];
    } else {
      // month
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }

    groups[key] = (groups[key] || 0) + 1;
  }

  return Object.entries(groups)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

