/**
 * AI Controller
 * 
 * WHY: Request handlers cho AI operations
 * - Generate AI responses
 * - Check proxy balance
 * - Get API logs
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { aiService } from '../services/ai/ai.service';
import { proxyBalanceService } from '../services/ai/proxy-balance.service';
import { logger } from '../infrastructure/logger';
import { requireTenant } from '../middleware/tenant';
import { prisma } from '../infrastructure/database';

// Validation schemas
const generateResponseSchema = z.object({
  conversationId: z.string().min(1),
  message: z.string().min(1),
});

/**
 * Generate AI response
 */
export async function generateResponseHandler(
  request: FastifyRequest<{ Body: { conversationId: string; message: string } }>,
  reply: FastifyReply
) {
  try {
    const tenant = requireTenant(request);
    const validatedData = generateResponseSchema.parse(request.body);

    // Verify conversation belongs to tenant
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: validatedData.conversationId,
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

    // Generate AI response
    const response = await aiService.generateResponse(
      validatedData.conversationId,
      validatedData.message,
      conversation.chatbotId
    );

    return reply.status(200).send({
      success: true,
      data: {
        response,
        conversationId: validatedData.conversationId,
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

    logger.error('Generate response error:', error);
    return reply.status(500).send({
      error: {
        message: error instanceof Error ? error.message : 'Internal server error',
        statusCode: 500,
      },
    });
  }
}

/**
 * Check proxy balance
 */
export async function checkBalanceHandler(
  _request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const balance = await proxyBalanceService.checkBalance();

    return reply.status(200).send({
      success: true,
      data: balance,
    });
  } catch (error) {
    logger.error('Check balance error:', error);
    return reply.status(500).send({
      error: {
        message: error instanceof Error ? error.message : 'Failed to check balance',
        statusCode: 500,
      },
    });
  }
}

/**
 * Get API logs
 */
export async function getLogsHandler(
  _request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const logs = await proxyBalanceService.getLogs();

    return reply.status(200).send({
      success: true,
      data: {
        html: logs,
      },
    });
  } catch (error) {
    logger.error('Get logs error:', error);
    return reply.status(500).send({
      error: {
        message: error instanceof Error ? error.message : 'Failed to get logs',
        statusCode: 500,
      },
    });
  }
}

