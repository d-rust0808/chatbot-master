/**
 * Access Log Middleware
 * 
 * WHY: Log tất cả HTTP requests vào database
 * - Track IP addresses và request patterns
 * - Support suspicious IP detection
 * - Non-blocking async logging
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { accessLogService } from '../services/access-log/access-log.service';
import type { AuthenticatedRequest } from '../types/auth';
import type { TenantRequest } from '../types/tenant';

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
 * Extract path from URL (without query string)
 */
function extractPath(url: string): string {
  try {
    const urlObj = new URL(url, 'http://localhost');
    return urlObj.pathname;
  } catch {
    // If URL parsing fails, extract path manually
    const pathMatch = url.match(/^[^?]+/);
    return pathMatch ? pathMatch[0] : url;
  }
}

/**
 * Access Log Data stored in request context
 */
interface AccessLogContext {
  startTime: number;
  ipAddress: string;
  method: string;
  url: string;
  path: string;
  userAgent?: string;
  referer?: string;
  tenantId?: string;
  userId?: string;
}

/**
 * Access Log Middleware - Store request context
 * WHY: Store context để log sau khi response sent
 */
export async function accessLogMiddleware(
  request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
  const startTime = Date.now();
  const ipAddress = extractIPAddress(request);
  const method = request.method;
  const url = request.url;
  const path = extractPath(url);
  const userAgent = request.headers['user-agent'] || undefined;
  const referer = request.headers.referer || undefined;

  // Get tenant and user info if available
  const authRequest = request as AuthenticatedRequest;
  const tenantRequest = request as TenantRequest;
  const tenantId = tenantRequest.tenant?.id;
  const userId = authRequest.user?.userId;

  // Store context in request for later use
  (request as any).accessLogContext = {
    startTime,
    ipAddress,
    method,
    url,
    path,
    userAgent,
    referer,
    tenantId,
    userId,
  } as AccessLogContext;
}

/**
 * Access Log Response Hook
 * WHY: Log sau khi response sent (non-blocking)
 */
export async function accessLogResponseHook(
  request: FastifyRequest,
  reply: FastifyReply,
  _payload: unknown
): Promise<void> {
  const context = (request as any).accessLogContext as AccessLogContext | undefined;
  
  if (!context) {
    return; // No context, skip logging
  }

  const responseTime = Date.now() - context.startTime;
  const statusCode = reply.statusCode;

  // Log request (async, non-blocking)
  await accessLogService.logRequest({
    ipAddress: context.ipAddress,
    method: context.method,
    url: context.url,
    path: context.path,
    statusCode,
    responseTime,
    userAgent: context.userAgent,
    referer: context.referer,
    tenantId: context.tenantId,
    userId: context.userId,
    error: statusCode >= 400 ? `HTTP ${statusCode}` : undefined,
  });
}

