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
  let token: string | undefined;
  
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

    token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    let decoded: JWTPayload;
    try {
      decoded = jwt.verify(token, config.jwt.secret) as JWTPayload;
    } catch (jwtError) {
      if (jwtError instanceof jwt.TokenExpiredError) {
        logger.warn('Token expired:', {
          expiredAt: jwtError.expiredAt,
          userId: (jwtError as any).payload?.userId,
        });
        return reply.status(401).send({
          error: {
            message: 'Token expired',
            statusCode: 401,
          },
        });
      }
      if (jwtError instanceof jwt.JsonWebTokenError) {
        logger.warn('Invalid JWT token:', {
          message: jwtError.message,
          name: jwtError.name,
          token: token ? token.substring(0, 20) + '...' : 'N/A',
        });
        return reply.status(401).send({
          error: {
            message: 'Invalid token',
            statusCode: 401,
            details: jwtError.message,
          },
        });
      }
      throw jwtError;
    }

    // Load user từ DB để get latest role (nếu role thay đổi)
    const { prisma } = await import('../infrastructure/database');
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        tenants: {
          include: {
            tenant: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      logger.warn('User not found in database', {
        userId: decoded.userId,
        email: decoded.email,
      });
      return reply.status(401).send({
        error: {
          message: 'User not found',
          statusCode: 401,
        },
      });
    }

    // Get primary tenant (owner tenant or first tenant)
    const primaryTenant = user.tenants.find((tu) => tu.role === 'owner') || user.tenants[0];

    // Attach user to request với latest role và tenantId
    // Type assertion vì Prisma type chưa update ngay
    const userWithRole = user as typeof user & { systemRole: string };
    (request as AuthenticatedRequest).user = {
      ...decoded,
      role: userWithRole.systemRole || decoded.role || 'admin', // Default admin
      tenantId: primaryTenant?.tenant.id, // Add primary tenant ID
    };
  } catch (error) {
    logger.error('Auth middleware error:', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      token: token ? token.substring(0, 20) + '...' : 'N/A',
    });
    return reply.status(401).send({
      error: {
        message: 'Unauthorized',
        statusCode: 401,
        details: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
}

