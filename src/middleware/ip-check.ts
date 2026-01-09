/**
 * IP Check Middleware
 * 
 * WHY: Block blacklisted IPs và allow whitelisted IPs
 * - Check IP against blacklist/whitelist
 * - Support CIDR ranges
 * - Fast lookup với caching
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { ipManagementService } from '../services/ip-management/ip-management.service';
import { logger } from '../infrastructure/logger';

/**
 * Extract IP address from request
 * WHY: Handle proxy headers (X-Forwarded-For)
 */
function extractIPAddress(request: FastifyRequest): string {
  // Check X-Forwarded-For header (first IP in chain)
  const forwardedFor = request.headers['x-forwarded-for'];
  if (forwardedFor) {
    const ips = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
    return ips.split(',')[0].trim();
  }

  // Check X-Real-IP header
  const realIP = request.headers['x-real-ip'];
  if (realIP) {
    return Array.isArray(realIP) ? realIP[0] : realIP;
  }

  // Fallback to request.ip
  return request.ip || 'unknown';
}

/**
 * IP Check Middleware
 * WHY: Block blacklisted IPs before request processing
 */
export async function checkIPMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const ipAddress = extractIPAddress(request);

    // Skip check for unknown IPs (local development)
    if (ipAddress === 'unknown' || ipAddress === '127.0.0.1' || ipAddress === '::1') {
      // In development, allow localhost
      // In production, you might want to block unknown IPs
      return;
    }

    // Check whitelist first (whitelist takes priority)
    const isWhitelisted = await ipManagementService.isIPWhitelisted(ipAddress);
    if (isWhitelisted) {
      // Whitelisted IPs bypass all checks
      return;
    }

    // Check blacklist
    const isBlacklisted = await ipManagementService.isIPBlacklisted(ipAddress);
    if (isBlacklisted) {
      logger.warn('Blocked blacklisted IP', {
        ipAddress,
        path: request.url,
        method: request.method,
      });

      return reply.status(403).send({
        error: {
          message: 'Access denied',
          code: 'IP_BLOCKED',
          statusCode: 403,
        },
      });
    }
  } catch (error) {
    // On error, log but don't block (fail open for availability)
    logger.error('IP check middleware error', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    // Continue request processing on error
  }
}

