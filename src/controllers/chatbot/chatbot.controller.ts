/**
 * Chatbot Controller
 * 
 * WHY: Request handlers cho chatbot operations
 * - Create/update chatbot
 * - Configure AI model
 * - Get chatbot settings
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../infrastructure/database';
import { logger } from '../../infrastructure/logger';
import { requireTenant } from '../../middleware/tenant';
import { modelService } from '../../services/ai/model.service';
import { cacheService } from '../../services/cache.service';
import { formatSuccessResponse, formatErrorResponse } from '../../utils/response-format';

// Validation schemas
const createChatbotSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  systemPrompt: z.string().max(2000).optional(),
  aiModel: z.string().min(1),
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().min(1).max(4000).default(1000),
});

const updateChatbotSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  systemPrompt: z.string().max(2000).optional(),
  aiModel: z.string().min(1).optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().min(1).max(4000).optional(),
  isActive: z.boolean().optional(),
});

/**
 * Create chatbot
 */
export async function createChatbotHandler(
  request: FastifyRequest<{
    Body: {
      name: string;
      description?: string;
      systemPrompt?: string;
      aiModel: string;
      temperature?: number;
      maxTokens?: number;
    };
  }>,
  reply: FastifyReply
) {
  try {
    const tenant = requireTenant(request);
    const validatedData = createChatbotSchema.parse(request.body);

    // Verify model is available
    const isAvailable = await modelService.isModelAvailable(validatedData.aiModel);
    if (!isAvailable) {
      return reply.status(400).send(
        formatErrorResponse(
          'VALIDATION_ERROR',
          `Model ${validatedData.aiModel} is not available`,
          400
        )
      );
    }

    // Create chatbot
    const chatbot = await prisma.chatbot.create({
      data: {
        tenantId: tenant.id,
        name: validatedData.name,
        description: validatedData.description,
        systemPrompt: validatedData.systemPrompt,
        aiModel: validatedData.aiModel,
        temperature: validatedData.temperature,
        maxTokens: validatedData.maxTokens,
      },
    });

    // Cache chatbot config
    await cacheService.set(
      cacheService.chatbotKey(tenant.id, chatbot.id),
      chatbot,
      3600 // 1 hour
    );

    const formattedResponse = formatSuccessResponse(
      chatbot,
      201,
      'Chatbot created successfully'
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

    logger.error('Create chatbot error:', error);
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
 * Update chatbot
 */
export async function updateChatbotHandler(
  request: FastifyRequest<{
    Params: { chatbotId: string };
    Body: {
      name?: string;
      description?: string;
      systemPrompt?: string;
      aiModel?: string;
      temperature?: number;
      maxTokens?: number;
      isActive?: boolean;
    };
  }>,
  reply: FastifyReply
) {
  try {
    const tenant = requireTenant(request);
    const { chatbotId } = request.params;
    const validatedData = updateChatbotSchema.parse(request.body);

    // Verify chatbot belongs to tenant
    const existingChatbot = await prisma.chatbot.findFirst({
      where: {
        id: chatbotId,
        tenantId: tenant.id,
      },
    });

    if (!existingChatbot) {
      return reply.status(404).send(
        formatErrorResponse(
          'NOT_FOUND_ERROR',
          'Chatbot not found',
          404
        )
      );
    }

    // Verify model if updating
    if (validatedData.aiModel && validatedData.aiModel !== existingChatbot.aiModel) {
      const isAvailable = await modelService.isModelAvailable(validatedData.aiModel);
      if (!isAvailable) {
        return reply.status(400).send(
          formatErrorResponse(
            'VALIDATION_ERROR',
            `Model ${validatedData.aiModel} is not available`,
            400
          )
        );
      }
    }

    // Update chatbot
    const chatbot = await prisma.chatbot.update({
      where: { id: chatbotId },
      data: validatedData,
    });

    const formattedResponse = formatSuccessResponse(
      chatbot,
      200,
      'Chatbot updated successfully'
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

    logger.error('Update chatbot error:', error);
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
 * Get chatbot
 */
export async function getChatbotHandler(
  request: FastifyRequest<{ Params: { chatbotId: string } }>,
  reply: FastifyReply
) {
  try {
    const tenant = requireTenant(request);
    const { chatbotId } = request.params;

    const chatbot = await prisma.chatbot.findFirst({
      where: {
        id: chatbotId,
        tenantId: tenant.id,
      },
      include: {
        platforms: {
          select: {
            id: true,
            platform: true,
            status: true,
          },
        },
        _count: {
          select: {
            conversations: true,
          },
        },
      },
    });

    if (!chatbot) {
      return reply.status(404).send(
        formatErrorResponse(
          'NOT_FOUND_ERROR',
          'Chatbot not found',
          404
        )
      );
    }

    const formattedResponse = formatSuccessResponse(
      chatbot,
      200,
      'Chatbot retrieved successfully'
    );
    return reply.status(200).send(formattedResponse);
  } catch (error) {
    logger.error('Get chatbot error:', error);
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
 * List chatbots
 */
export async function listChatbotsHandler(
  request: FastifyRequest<{ Querystring: { page?: string; limit?: string } }>,
  reply: FastifyReply
) {
  try {
    const tenant = requireTenant(request);
    const page = parseInt(request.query.page || '1');
    const limit = Math.min(parseInt(request.query.limit || '50'), 100);
    const skip = (page - 1) * limit;

    const [chatbots, total] = await Promise.all([
      prisma.chatbot.findMany({
        where: { tenantId: tenant.id },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              conversations: true,
              platforms: true,
            },
          },
        },
      }),
      prisma.chatbot.count({
        where: { tenantId: tenant.id },
      }),
    ]);

    const formattedResponse = formatSuccessResponse(
      chatbots,
      200,
      'Chatbots retrieved successfully',
      {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      }
    );
    return reply.status(200).send(formattedResponse);
  } catch (error) {
    logger.error('List chatbots error:', error);
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
 * Get available models
 */
export async function getAvailableModelsHandler(
  _request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const recommendedModels = await modelService.getRecommendedModels();
    const allModels = await modelService.getAvailableModels();

    const formattedResponse = formatSuccessResponse(
      {
        recommended: recommendedModels,
        all: allModels.map((m) => ({
          name: m.name.trim(),
          uptime: m.uptime,
          status: m.status,
        })),
      },
      200,
      'Available models retrieved successfully'
    );
    return reply.status(200).send(formattedResponse);
  } catch (error) {
    logger.error('Get available models error:', error);
    return reply.status(500).send(
      formatErrorResponse(
        'INTERNAL_ERROR',
        error instanceof Error ? error.message : 'Internal server error',
        500
      )
    );
  }
}

