/**
 * Platform Controller
 * 
 * WHY: Request handlers cho platform operations
 * - Connect/disconnect platforms
 * - Send messages
 * - Get chats
 * - Manage connections
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { platformManager } from '../../services/platform/platform-manager.service';
import { messageQueueService } from '../../services/message-queue.service';
import { prisma } from '../../infrastructure/database';
import { logger } from '../../infrastructure/logger';
import { requireTenant } from '../../middleware/tenant';

// Validation schemas
const connectPlatformSchema = z.object({
  chatbotId: z.string().min(1),
  platform: z.enum(['whatsapp', 'facebook', 'instagram', 'tiktok', 'zalo', 'shopee']),
  credentials: z.record(z.unknown()).optional(),
  options: z.record(z.unknown()).optional(),
});

const sendMessageSchema = z.object({
  connectionId: z.string().min(1),
  chatId: z.string().min(1),
  message: z.string().min(1),
  options: z
    .object({
      mediaUrl: z.string().url().optional(),
      mediaPath: z.string().optional(),
      mediaType: z.enum(['image', 'video', 'document', 'audio']).optional(),
      sendAsGif: z.boolean().optional(),
      sendAsVoice: z.boolean().optional(),
    })
    .optional(),
  useQueue: z.boolean().optional().default(false), // Use queue for async processing
});

/**
 * Connect platform
 */
export async function connectPlatformHandler(
  request: FastifyRequest<{ Body: { chatbotId: string; platform: string; credentials?: unknown; options?: unknown } }>,
  reply: FastifyReply
) {
  try {
    const tenant = requireTenant(request);

    // Validate input
    const validatedData = connectPlatformSchema.parse(request.body);

    // Verify chatbot belongs to tenant
    const chatbot = await prisma.chatbot.findFirst({
      where: {
        id: validatedData.chatbotId,
        tenantId: tenant.id,
      },
    });

    if (!chatbot) {
      return reply.status(404).send({
        error: {
          message: 'Chatbot not found',
          statusCode: 404,
        },
      });
    }

    // Check if connection already exists
    let connection = await prisma.platformConnection.findUnique({
      where: {
        chatbotId_platform: {
          chatbotId: validatedData.chatbotId,
          platform: validatedData.platform,
        },
      },
    });

    // Create connection nếu chưa có
    if (!connection) {
      connection = await prisma.platformConnection.create({
        data: {
          chatbotId: validatedData.chatbotId,
          platform: validatedData.platform,
          status: 'disconnected',
          credentials: (validatedData.credentials || {}) as any,
        },
      });
    }

    // Connect platform
    await platformManager.connectPlatform(connection.id, {
      platform: validatedData.platform as any,
      credentials: validatedData.credentials,
      options: validatedData.options,
    });

    return reply.status(200).send({
      success: true,
      data: {
        connectionId: connection.id,
        status: 'connected',
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

    logger.error('Connect platform error:', error);
    return reply.status(500).send({
      error: {
        message: error instanceof Error ? error.message : 'Internal server error',
        statusCode: 500,
      },
    });
  }
}

/**
 * Disconnect platform
 */
export async function disconnectPlatformHandler(
  request: FastifyRequest<{ Params: { connectionId: string } }>,
  reply: FastifyReply
) {
  try {
    const tenant = requireTenant(request);
    const { connectionId } = request.params;

    // Verify connection belongs to tenant
    const connection = await prisma.platformConnection.findFirst({
      where: {
        id: connectionId,
        chatbot: {
          tenantId: tenant.id,
        },
      },
    });

    if (!connection) {
      return reply.status(404).send({
        error: {
          message: 'Connection not found',
          statusCode: 404,
        },
      });
    }

    // Disconnect
    await platformManager.disconnectPlatform(connectionId);

    return reply.status(200).send({
      success: true,
      message: 'Platform disconnected',
    });
  } catch (error) {
    logger.error('Disconnect platform error:', error);
    return reply.status(500).send({
      error: {
        message: error instanceof Error ? error.message : 'Internal server error',
        statusCode: 500,
      },
    });
  }
}

/**
 * Get platform connections
 */
export async function getConnectionsHandler(
  request: FastifyRequest<{ Querystring: { chatbotId?: string } }>,
  reply: FastifyReply
) {
  try {
    const tenant = requireTenant(request);
    const { chatbotId } = request.query;

    const where: any = {
      chatbot: {
        tenantId: tenant.id,
      },
    };

    if (chatbotId) {
      where.chatbotId = chatbotId;
    }

    const connections = await prisma.platformConnection.findMany({
      where,
      include: {
        chatbot: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return reply.status(200).send({
      success: true,
      data: connections,
    });
  } catch (error) {
    logger.error('Get connections error:', error);
    return reply.status(500).send({
      error: {
        message: 'Internal server error',
        statusCode: 500,
      },
    });
  }
}

/**
 * Send message
 */
export async function sendMessageHandler(
  request: FastifyRequest<{ Body: { connectionId: string; chatId: string; message: string } }>,
  reply: FastifyReply
) {
  try {
    const tenant = requireTenant(request);
    const validatedData = sendMessageSchema.parse(request.body);

    // Verify connection belongs to tenant
    const connection = await prisma.platformConnection.findFirst({
      where: {
        id: validatedData.connectionId,
        chatbot: {
          tenantId: tenant.id,
        },
      },
    });

    if (!connection) {
      return reply.status(404).send({
        error: {
          message: 'Connection not found',
          statusCode: 404,
        },
      });
    }

    // Send message (sync hoặc async via queue)
    if (validatedData.useQueue) {
      // Enqueue message để process async
      const jobId = await messageQueueService.enqueueMessage({
        connectionId: validatedData.connectionId,
        chatId: validatedData.chatId,
        message: validatedData.message,
        options: validatedData.options,
      });

      return reply.status(202).send({
        success: true,
        message: 'Message queued',
        data: {
          jobId,
          status: 'queued',
        },
      });
    } else {
      // Send immediately (synchronous)
    await platformManager.sendMessage(
      validatedData.connectionId,
      validatedData.chatId,
        validatedData.message,
        validatedData.options
    );

    return reply.status(200).send({
      success: true,
      message: 'Message sent',
    });
    }
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

    logger.error('Send message error:', error);
    return reply.status(500).send({
      error: {
        message: error instanceof Error ? error.message : 'Internal server error',
        statusCode: 500,
      },
    });
  }
}

/**
 * Get chats
 */
export async function getChatsHandler(
  request: FastifyRequest<{ Params: { connectionId: string } }>,
  reply: FastifyReply
) {
  try {
    const tenant = requireTenant(request);
    const { connectionId } = request.params;

    // Verify connection belongs to tenant
    const connection = await prisma.platformConnection.findFirst({
      where: {
        id: connectionId,
        chatbot: {
          tenantId: tenant.id,
        },
      },
    });

    if (!connection) {
      return reply.status(404).send({
        error: {
          message: 'Connection not found',
          statusCode: 404,
        },
      });
    }

    // Get chats
    const chats = await platformManager.getChats(connectionId);

    return reply.status(200).send({
      success: true,
      data: chats,
    });
  } catch (error) {
    logger.error('Get chats error:', error);
    return reply.status(500).send({
      error: {
        message: error instanceof Error ? error.message : 'Internal server error',
        statusCode: 500,
      },
    });
  }
}

