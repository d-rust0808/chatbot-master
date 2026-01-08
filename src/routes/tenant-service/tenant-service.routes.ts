/**
 * Tenant Service & Workflow routes
 *
 * WHY:
 * - Tenant-level service config (bật/tắt whatsapp, messenger, tiktok, ...)
 * - User-level service permissions trong tenant
 * - Workflow config cho chatbot
 */

import { FastifyInstance } from 'fastify';
import { authenticate } from '../../middleware/auth';
import { requireAdmin } from '../../middleware/role-check';
import {
  listTenantServicesHandler,
  upsertTenantServicesHandler,
  listUserServicePermissionsHandler,
  upsertUserServicePermissionsHandler,
  listWorkflowsHandler,
  createWorkflowHandler,
  updateWorkflowHandler,
  deleteWorkflowHandler,
} from '../../controllers/tenant-service/tenant-service.controller';

export async function tenantServiceRoutes(fastify: FastifyInstance) {
  // Require authenticated tenant admin
  fastify.addHook('preHandler', authenticate);
  fastify.addHook('preHandler', requireAdmin);

  // Tenant-level services
  fastify.get('/tenants/:tenantId/services', listTenantServicesHandler);
  fastify.put('/tenants/:tenantId/services', upsertTenantServicesHandler);

  // User-level service permissions
  fastify.get(
    '/tenants/:tenantId/users/:userId/services',
    listUserServicePermissionsHandler
  );
  fastify.put(
    '/tenants/:tenantId/users/:userId/services',
    upsertUserServicePermissionsHandler
  );

  // Workflows
  fastify.get('/tenants/:tenantId/workflows', listWorkflowsHandler);
  fastify.post('/tenants/:tenantId/workflows', createWorkflowHandler);
  fastify.patch(
    '/tenants/:tenantId/workflows/:workflowId',
    updateWorkflowHandler
  );
  fastify.delete(
    '/tenants/:tenantId/workflows/:workflowId',
    deleteWorkflowHandler
  );
}


