/**
 * Rate Limiting Middleware
 * 
 * WHY: Prevent abuse và protect API
 * - Per-tenant rate limiting
 * - Per-endpoint rate limiting
 * - Redis-based tracking
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { redis } from '../infrastructure/redis';
import { logger } from '../infrastructure/logger';
import { requireTenant } from './tenant';

/**
 * Rate limit configuration
 */
interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  max: number; // Maximum requests per window
  message?: string; // Custom error message
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  skipFailedRequests?: boolean; // Don't count failed requests
}

/**
 * Default rate limit configs
 */
const DEFAULT_RATE_LIMITS: Record<string, RateLimitConfig> = {
  // Auth endpoints - stricter limits
  '/api/v1/auth/login': {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per 15 minutes
    message: 'Too many login attempts. Please try again later.',
  },
  '/api/v1/auth/register': {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 registrations per hour
    message: 'Too many registration attempts. Please try again later.',
  },
  // AI endpoints - moderate limits
  '/api/v1/ai/generate': {
    windowMs: 60 * 1000, // 1 minute
    max: 20, // 20 requests per minute
    message: 'Rate limit exceeded. Please slow down.',
  },
  // Onboarding - moderate limits
  '/api/v1/onboarding': {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // 5 onboarding attempts per hour
    message: 'Too many onboarding attempts. Please try again later.',
  },
  // Default for all other endpoints
  default: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per 15 minutes
    message: 'Rate limit exceeded. Please try again later.',
  },
};

/**
 * Get rate limit config for endpoint
 */
function getRateLimitConfig(path: string): RateLimitConfig {
  // Check for exact match
  if (DEFAULT_RATE_LIMITS[path]) {
    return DEFAULT_RATE_LIMITS[path];
  }

  // Check for prefix match
  for (const [key, config] of Object.entries(DEFAULT_RATE_LIMITS)) {
    if (key !== 'default' && path.startsWith(key)) {
      return config;
    }
  }

  // Return default
  return DEFAULT_RATE_LIMITS.default;
}

/**
 * Rate limit middleware
 */
export async function rateLimitMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    // Skip rate limiting for health checks
    if (request.url === '/health' || request.url === '/api/v1/health') {
      return;
    }

    const config = getRateLimitConfig(request.url);
    const tenant = requireTenant(request);

    // Build rate limit key: tenantId:endpoint:window
    const window = Math.floor(Date.now() / config.windowMs);
    const key = `rate_limit:${tenant.id}:${request.url}:${window}`;

    // Get current count
    const count = await redis.incr(key);

    // Set expiry if this is the first request in this window
    if (count === 1) {
      await redis.expire(key, Math.ceil(config.windowMs / 1000));
    }

    // Check if limit exceeded
    if (count > config.max) {
      const retryAfter = Math.ceil((config.windowMs - (Date.now() % config.windowMs)) / 1000);

      logger.warn('Rate limit exceeded', {
        tenantId: tenant.id,
        endpoint: request.url,
        count,
        max: config.max,
      });

      return reply.status(429).send({
        error: {
          message: config.message || 'Rate limit exceeded',
          statusCode: 429,
          retryAfter,
        },
      });
    }

    // Add rate limit headers
    reply.header('X-RateLimit-Limit', config.max.toString());
    reply.header('X-RateLimit-Remaining', Math.max(0, config.max - count).toString());
    reply.header('X-RateLimit-Reset', new Date((window + 1) * config.windowMs).toISOString());
  } catch (error) {
    // If rate limiting fails, log but don't block request
    logger.error('Rate limit middleware error:', error);
    // Continue without rate limiting
  }
}

