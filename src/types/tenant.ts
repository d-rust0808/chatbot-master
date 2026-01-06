/**
 * Multi-tenant types
 * 
 * WHY: Type-safe tenant context
 * - Tenant isolation
 * - Request extensions
 */

import { FastifyRequest } from 'fastify';

// Extended FastifyRequest với tenant info
export interface TenantRequest extends FastifyRequest {
  tenant?: {
    id: string;
    slug: string;
    name: string;
  };
}

// Tenant context (được set bởi middleware)
export interface TenantContext {
  id: string;
  slug: string;
  name: string;
}

