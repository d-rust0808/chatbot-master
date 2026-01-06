/**
 * Global error handler for Fastify
 * 
 * WHY: Centralized error handling
 * - Consistent error response format
 * - Logging errors
 * - Security: không expose internal errors
 */

import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { logger } from './logger';
import { config } from './config';

interface ErrorResponse {
  error: {
    message: string;
    code?: string;
    statusCode: number;
    details?: unknown;
  };
  timestamp: string;
  requestId?: string;
}

export const errorHandler = (
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const requestId = request.id;
  const statusCode = error.statusCode || 500;
  
  // Log error (với full stack trace trong development)
  if (statusCode >= 500) {
    logger.error('Server error:', {
      error: error.message,
      stack: config.isDevelopment ? error.stack : undefined,
      requestId,
      path: request.url,
      method: request.method,
    });
  } else {
    logger.warn('Client error:', {
      error: error.message,
      requestId,
      path: request.url,
      method: request.method,
    });
  }
  
  // Build error response
  const errorResponse: ErrorResponse = {
    error: {
      message: error.message || 'Internal server error',
      statusCode,
      // Chỉ expose code và details trong development
      ...(config.isDevelopment && {
        code: error.code,
        details: error.validation || error.cause,
      }),
    },
    timestamp: new Date().toISOString(),
    requestId,
  };
  
  // Send response
  reply.status(statusCode).send(errorResponse);
};

