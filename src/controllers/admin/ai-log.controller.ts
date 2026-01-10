/**
 * AI Log Controller (SP-Admin only)
 * 
 * WHY: API handlers cho AI request logs
 * - Hiển thị logs
 * - Monitor suspicious IPs
 * - Track costs
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { aiRequestLogService } from '../../services/ai/ai-request-log.service';
import { logger } from '../../infrastructure/logger';
import { formatSuccessResponse, formatErrorResponse } from '../../utils/response-format';

/**
 * List logs query schema
 */
const listLogsSchema = z.object({
  tenantId: z.string().optional(),
  provider: z.enum(['openai', 'gemini', 'deepseek']).optional(),
  model: z.string().optional(),
  ipAddress: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.string().transform(Number).pipe(z.number().int().positive()).default('1'),
  limit: z.string().transform(Number).pipe(z.number().int().positive().max(100)).default('50'),
});

/**
 * Get suspicious IPs query schema
 */
const getSuspiciousIPsSchema = z.object({
  threshold: z.string().transform(Number).pipe(z.number().int().positive()).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

/**
 * List AI request logs
 * GET /sp-admin/ai-logs
 */
export async function listAILogsHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const query = listLogsSchema.parse(request.query);
    
    const result = await aiRequestLogService.getLogs({
      tenantId: query.tenantId,
      provider: query.provider,
      model: query.model,
      ipAddress: query.ipAddress,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      page: query.page,
      limit: query.limit,
    });
    
    const formattedResponse = formatSuccessResponse(
      result.data,
      200,
      'AI logs retrieved successfully',
      result.meta
    );
    return reply.status(200).send(formattedResponse);
  } catch (error) {
    logger.error('Failed to list AI logs', {
      error: error instanceof Error ? error.message : String(error),
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
        'Failed to list AI logs',
        500
      )
    );
  }
}

/**
 * Get suspicious IPs
 * GET /sp-admin/ai-logs/suspicious-ips
 */
export async function getSuspiciousIPsHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const query = getSuspiciousIPsSchema.parse(request.query);
    
    const result = await aiRequestLogService.getSuspiciousIPs({
      threshold: query.threshold,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
    });
    
    const formattedResponse = formatSuccessResponse(
      result,
      200,
      'Suspicious IPs retrieved successfully'
    );
    return reply.status(200).send(formattedResponse);
  } catch (error) {
    logger.error('Failed to get suspicious IPs', {
      error: error instanceof Error ? error.message : String(error),
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
        'Failed to get suspicious IPs',
        500
      )
    );
  }
}

