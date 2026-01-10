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
import { formatErrorResponse } from '../utils/response-format';

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
  
  // Build error response using standardized format
  const errorCode = error.code || 'INTERNAL_ERROR';
  const errorMessage = error.message || 'Internal server error';
  const errorDetails = config.isDevelopment 
    ? (error.validation || error.cause)
    : undefined;
  
  const errorResponse = formatErrorResponse(
    errorCode,
    errorMessage,
    statusCode,
    errorDetails,
    requestId
  );
  
  // Send response
  reply.status(statusCode).send(errorResponse);
};

