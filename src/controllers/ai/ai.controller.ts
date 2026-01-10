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
import { aiService } from '../../services/ai/ai.service';
import { proxyBalanceService } from '../../services/ai/proxy-balance.service';
import { logger } from '../../infrastructure/logger';
import { requireTenant } from '../../middleware/tenant';
import { prisma } from '../../infrastructure/database';
import { formatSuccessResponse, formatErrorResponse } from '../../utils/response-format';

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
      return reply.status(404).send(
        formatErrorResponse(
          'NOT_FOUND_ERROR',
          'Conversation not found',
          404
        )
      );
    }

    // Get IP and user agent for logging
    const ipAddress =
      request.ip ||
      (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      undefined;
    const userAgent = (request.headers['user-agent'] as string) || undefined;

    // Generate AI response
    const response = await aiService.generateResponse(
      validatedData.conversationId,
      validatedData.message,
      conversation.chatbotId,
      {
        ipAddress,
        userAgent,
      }
    );

    const formattedResponse = formatSuccessResponse(
      {
        response,
        conversationId: validatedData.conversationId,
      },
      200,
      'AI response generated successfully'
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

    logger.error('Generate response error:', error);
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
 * Check proxy balance
 * WHY: SP-Admin xem balance từ v98store proxy
 */
export async function checkBalanceHandler(
  _request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const balance = await proxyBalanceService.checkBalance();

    // Return format matching v98store API response
    const formattedResponse = formatSuccessResponse(
      {
        remain_quota: balance.remaining,
        used_quota: balance.used,
      },
      200,
      'Proxy balance retrieved successfully'
    );
    return reply.status(200).send(formattedResponse);
  } catch (error) {
    logger.error('Check balance error:', error);
    return reply.status(500).send(
      formatErrorResponse(
        'INTERNAL_ERROR',
        error instanceof Error ? error.message : 'Failed to check balance',
        500
      )
    );
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

    const formattedResponse = formatSuccessResponse(
      {
        html: logs,
      },
      200,
      'API logs retrieved successfully'
    );
    return reply.status(200).send(formattedResponse);
  } catch (error) {
    logger.error('Get logs error:', error);
    return reply.status(500).send(
      formatErrorResponse(
        'INTERNAL_ERROR',
        error instanceof Error ? error.message : 'Failed to get logs',
        500
      )
    );
  }
}

