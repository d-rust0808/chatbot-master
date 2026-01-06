/**
 * Admin routes
 * 
 * WHY: API endpoints cho admin quản trị
 */

import { FastifyInstance } from 'fastify';
import {
  getSystemStatsHandler,
  listUsersHandler,
  listTenantsHandler,
  getTenantHandler,
} from '../controllers/admin.controller';
import { authenticate } from '../middleware/auth';

/**
 * Admin routes plugin
 */
export async function adminRoutes(fastify: FastifyInstance) {
  // All routes require authentication
  fastify.addHook('preHandler', authenticate);

  // TODO: Add admin role check middleware
  // For now, any authenticated user can access (should restrict later)

  // System statistics
  fastify.get('/stats', getSystemStatsHandler);

  // User management
  fastify.get('/users', listUsersHandler);

  // Tenant management
  fastify.get('/tenants', listTenantsHandler);
  fastify.get('/tenants/:tenantId', getTenantHandler);
}

