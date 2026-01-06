/**
 * Authentication middleware
 * 
 * WHY: Reusable JWT verification
 * - Extract và verify JWT từ Authorization header
 * - Attach user info to request
 * - Type-safe request extension
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';
import { config } from '../infrastructure/config';
import { logger } from '../infrastructure/logger';
import type { AuthenticatedRequest, JWTPayload } from '../types/auth';

/**
 * Verify JWT token và attach user to request
 */
export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    // Extract token từ Authorization header
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.status(401).send({
        error: {
          message: 'Missing or invalid authorization header',
          statusCode: 401,
        },
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = jwt.verify(token, config.jwt.secret) as JWTPayload;

    // Attach user to request
    (request as AuthenticatedRequest).user = decoded;
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      logger.warn('Invalid JWT token:', error.message);
      return reply.status(401).send({
        error: {
          message: 'Invalid token',
          statusCode: 401,
        },
      });
    }

    logger.error('Auth middleware error:', error);
    return reply.status(500).send({
      error: {
        message: 'Internal server error',
        statusCode: 500,
      },
    });
  }
}

