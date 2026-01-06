/**
 * Conversation Controller
 * 
 * WHY: Conversation management endpoints
 * - List conversations
 * - Search/filter conversations
 * - Get conversation details
 * - Export conversations
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../infrastructure/database';
import { logger } from '../infrastructure/logger';
import { requireTenant } from '../middleware/tenant';

// Validation schemas
const listConversationsSchema = z.object({
  page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
  limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 50)),
  chatbotId: z.string().optional(),
  platform: z.string().optional(),
  status: z.enum(['active', 'closed', 'archived']).optional(),
  search: z.string().optional(),
});

/**
 * List conversations
 */
export async function listConversationsHandler(
  request: FastifyRequest<{
    Querystring: {
      page?: string;
      limit?: string;
      chatbotId?: string;
      platform?: string;
      status?: string;
      search?: string;
    };
  }>,
  reply: FastifyReply
) {
  try {
    const tenant = requireTenant(request);
    const validated = listConversationsSchema.parse(request.query);

    const page = validated.page || 1;
    const limit = Math.min(validated.limit || 50, 100);
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      tenantId: tenant.id,
    };

    if (validated.chatbotId) {
      where.chatbotId = validated.chatbotId;
    }

    if (validated.platform) {
      where.platform = validated.platform;
    }

    if (validated.status) {
      where.status = validated.status;
    }

    // Get conversations
    const [conversations, total] = await Promise.all([
      prisma.conversation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          chatbot: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: {
              messages: true,
            },
          },
        },
      }),
      prisma.conversation.count({ where }),
    ]);

    return reply.status(200).send({
      success: true,
      data: conversations,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
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

    logger.error('List conversations error:', error);
    return reply.status(500).send({
      error: {
        message: error instanceof Error ? error.message : 'Internal server error',
        statusCode: 500,
      },
    });
  }
}

/**
 * Get conversation details
 */
export async function getConversationHandler(
  request: FastifyRequest<{
    Params: { conversationId: string };
    Querystring: {
      page?: string;
      limit?: string;
    };
  }>,
  reply: FastifyReply
) {
  try {
    const tenant = requireTenant(request);
    const { conversationId } = request.params;
    const page = request.query.page ? parseInt(request.query.page, 10) : 1;
    const limit = Math.min(request.query.limit ? parseInt(request.query.limit, 10) : 50, 100);
    const skip = (page - 1) * limit;

    // Get conversation
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        tenantId: tenant.id,
      },
      include: {
        chatbot: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!conversation) {
      return reply.status(404).send({
        error: {
          message: 'Conversation not found',
          statusCode: 404,
        },
      });
    }

    // Get messages
    const [messages, totalMessages] = await Promise.all([
      prisma.message.findMany({
        where: { conversationId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.message.count({ where: { conversationId } }),
    ]);

    return reply.status(200).send({
      success: true,
      data: {
        conversation,
        messages: messages.reverse(), // Return in chronological order
        meta: {
          page,
          limit,
          totalMessages,
          totalPages: Math.ceil(totalMessages / limit),
        },
      },
    });
  } catch (error) {
    logger.error('Get conversation error:', error);
    return reply.status(500).send({
      error: {
        message: error instanceof Error ? error.message : 'Internal server error',
        statusCode: 500,
      },
    });
  }
}

/**
 * Export conversation
 */
export async function exportConversationHandler(
  request: FastifyRequest<{
    Params: { conversationId: string };
    Querystring: {
      format?: 'json' | 'csv' | 'txt';
    };
  }>,
  reply: FastifyReply
) {
  try {
    const tenant = requireTenant(request);
    const { conversationId } = request.params;
    const format = request.query.format || 'json';

    // Get conversation
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        tenantId: tenant.id,
      },
      include: {
        chatbot: {
          select: {
            name: true,
          },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!conversation) {
      return reply.status(404).send({
        error: {
          message: 'Conversation not found',
          statusCode: 404,
        },
      });
    }

    // Format export based on format
    let exportData: string;
    let contentType: string;
    let filename: string;

    if (format === 'json') {
      exportData = JSON.stringify(conversation, null, 2);
      contentType = 'application/json';
      filename = `conversation-${conversationId}.json`;
    } else if (format === 'csv') {
      // Convert to CSV
      const csvRows = [
        ['Timestamp', 'Direction', 'Content'],
        ...conversation.messages.map((msg) => [
          msg.createdAt.toISOString(),
          msg.direction,
          msg.content.replace(/"/g, '""'), // Escape quotes
        ]),
      ];
      exportData = csvRows.map((row) => `"${row.join('","')}"`).join('\n');
      contentType = 'text/csv';
      filename = `conversation-${conversationId}.csv`;
    } else {
      // txt format
      exportData = `Conversation: ${conversation.chatbot.name}\n`;
      exportData += `Platform: ${conversation.platform}\n`;
      exportData += `Status: ${conversation.status}\n`;
      exportData += `Created: ${conversation.createdAt.toISOString()}\n\n`;
      exportData += 'Messages:\n';
      exportData += conversation.messages
        .map(
          (msg) =>
            `[${msg.createdAt.toISOString()}] ${msg.direction.toUpperCase()}: ${msg.content}`
        )
        .join('\n');
      contentType = 'text/plain';
      filename = `conversation-${conversationId}.txt`;
    }

    return reply
      .header('Content-Type', contentType)
      .header('Content-Disposition', `attachment; filename="${filename}"`)
      .send(exportData);
  } catch (error) {
    logger.error('Export conversation error:', error);
    return reply.status(500).send({
      error: {
        message: error instanceof Error ? error.message : 'Internal server error',
        statusCode: 500,
      },
    });
  }
}

