/**
 * Multi-tenant middleware
 * 
 * WHY: Tenant isolation và routing
 * - Extract tenant từ header hoặc subdomain
 * - Validate tenant access
 * - Attach tenant context to request
 * - Security: prevent cross-tenant access
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../infrastructure/database';
import { logger } from '../infrastructure/logger';
import type { TenantRequest, TenantContext } from '../types/tenant';

/**
 * Extract tenant từ X-Tenant-Slug header hoặc subdomain
 * WHY: Flexible tenant identification
 */
async function extractTenant(request: FastifyRequest): Promise<string | null> {
  // Option 1: Header (recommended cho API)
  const tenantSlug = request.headers['x-tenant-slug'] as string | undefined;
  if (tenantSlug) {
    return tenantSlug;
  }

  // Option 2: Subdomain (cho web dashboard)
  const host = request.headers.host;
  if (host) {
    const parts = host.split('.');
    if (parts.length > 2) {
      // e.g., tenant1.chatbot.com → tenant1
      return parts[0];
    }
  }

  return null;
}

/**
 * Multi-tenant middleware plugin
 * WHY: Fastify plugin pattern cho reusability
 */
export async function tenantMiddleware(fastify: FastifyInstance) {
  // Register preHandler để extract tenant
  fastify.addHook('preHandler', async (request: TenantRequest, reply: FastifyReply) => {
    // Skip tenant check cho public routes
    const publicRoutes = ['/health', '/api/v1/auth/register', '/api/v1/auth/login'];
    if (publicRoutes.some((route) => request.url.startsWith(route))) {
      return;
    }

    // Extract tenant slug
    const tenantSlug = await extractTenant(request);
    if (!tenantSlug) {
      // Tenant không bắt buộc cho một số routes (sẽ check trong controller)
      return;
    }

    // Find tenant
    const tenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug },
    });

    if (!tenant) {
      return reply.status(404).send({
        error: {
          message: 'Tenant not found',
          statusCode: 404,
        },
      });
    }

    // Attach tenant to request
    request.tenant = {
      id: tenant.id,
      slug: tenant.slug,
      name: tenant.name,
    } as TenantContext;

    logger.debug('Tenant context attached', {
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
    });
  });
}

/**
 * Helper để require tenant trong route handlers
 */
export function requireTenant(request: FastifyRequest): TenantContext {
  const tenantRequest = request as TenantRequest;
  if (!tenantRequest.tenant) {
    throw new Error('Tenant context required but not found');
  }
  return tenantRequest.tenant;
}

