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
import type { TenantRequest } from '../types/tenant';

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
    max: 20, // 20 attempts per 15 minutes (increased for development/testing)
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

    // Public routes that don't need tenant context
    const publicRoutes = [
      '/api/v1/auth/register',
      '/api/v1/auth/login',
      '/api/v1/auth/refresh',
    ];
    
    // SP-admin routes that don't have tenant context
    const adminRoutes = [
      '/api/v1/admin',
    ];
    
    const isPublicRoute = publicRoutes.some(route => request.url.startsWith(route));
    const isAdminRoute = adminRoutes.some(route => request.url.startsWith(route));
    
    const config = getRateLimitConfig(request.url);
    
    // Check if tenant context exists (for tenant-scoped routes)
    const tenantRequest = request as TenantRequest;
    const hasTenantContext = !!tenantRequest.tenant;
    
    // For public routes or routes without tenant context (SP-admin), use IP-based rate limiting
    let rateLimitKey: string;
    if (isPublicRoute || isAdminRoute || !hasTenantContext) {
      // Use IP address for public/admin routes or routes without tenant context
      const clientIp = request.ip || request.headers['x-forwarded-for'] || 'unknown';
      const window = Math.floor(Date.now() / config.windowMs);
      rateLimitKey = `rate_limit:${isAdminRoute ? 'admin' : 'public'}:${clientIp}:${request.url}:${window}`;
    } else {
      // Use tenant-based rate limiting for tenant-scoped routes
      const tenant = tenantRequest.tenant!;
      const window = Math.floor(Date.now() / config.windowMs);
      rateLimitKey = `rate_limit:${tenant.id}:${request.url}:${window}`;
    }

    // Get current count
    const count = await redis.incr(rateLimitKey);

    // Set expiry if this is the first request in this window
    if (count === 1) {
      await redis.expire(rateLimitKey, Math.ceil(config.windowMs / 1000));
    }

    // Check if limit exceeded
    if (count > config.max) {
      const retryAfter = Math.ceil((config.windowMs - (Date.now() % config.windowMs)) / 1000);

      logger.warn('Rate limit exceeded', {
        endpoint: request.url,
        count,
        max: config.max,
        isPublicRoute,
        key: rateLimitKey,
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
    const window = Math.floor(Date.now() / config.windowMs);
    reply.header('X-RateLimit-Limit', config.max.toString());
    reply.header('X-RateLimit-Remaining', Math.max(0, config.max - count).toString());
    reply.header('X-RateLimit-Reset', new Date((window + 1) * config.windowMs).toISOString());
  } catch (error) {
    // If rate limiting fails, log but don't block request
    logger.error('Rate limit middleware error:', error);
    // Continue without rate limiting
  }
}

