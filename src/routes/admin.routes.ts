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
  createAdminHandler,
  createTenantHandler,
  updateTenantConfigHandler,
  configTenantChatbotSettingsHandler,
  listPlanTemplatesHandler,
  createPlanTemplateHandler,
  updatePlanTemplateHandler,
  deletePlanTemplateHandler,
  listTenantSubscriptionsHandler,
  createCustomerHandler,
  listTenantAdminsHandler,
  createTenantAdminHandler,
  updateTenantAdminHandler,
  deleteTenantAdminHandler,
} from '../controllers/admin/admin.controller';
import {
  createServicePackageHandler,
  updateServicePackageHandler,
  deleteServicePackageHandler,
  getAllServicePackagesHandler,
} from '../controllers/service-package/admin.controller';
import { authenticate } from '../middleware/auth';
import { requireSuperAdmin } from '../middleware/role-check';
import multipart from '@fastify/multipart';

/**
 * Admin routes plugin
 */
export async function adminRoutes(fastify: FastifyInstance) {
  // Register multipart for file uploads
  await fastify.register(multipart, {
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB max
    },
  });

  // Create admin endpoint (public, for first-time setup)
  fastify.post('/create-admin', createAdminHandler);

  // All other routes require authentication + super admin role
  fastify.addHook('preHandler', authenticate);
  fastify.addHook('preHandler', requireSuperAdmin);

  // System statistics (sp-admin only)
  fastify.get('/stats', getSystemStatsHandler);

  // User management (sp-admin only)
  fastify.get('/users', listUsersHandler);

  // Tenant management (sp-admin only)
  fastify.get('/tenants', listTenantsHandler);
  fastify.get('/tenants/:tenantId', getTenantHandler);
  
  // Create tenant (sp-admin only)
  fastify.post('/tenants', createTenantHandler);
  
  // Update tenant config (sp-admin only)
  fastify.patch('/tenants/:tenantId', updateTenantConfigHandler);
  fastify.put('/tenants/:tenantId', updateTenantConfigHandler);
  
  // Config chatbot settings cho tenant (sp-admin only)
  fastify.post('/tenants/:tenantId/chatbot-settings', configTenantChatbotSettingsHandler);
  fastify.patch('/tenants/:tenantId/chatbot-settings', configTenantChatbotSettingsHandler);

  // Plan templates (gói dịch vụ) cho SP admin
  fastify.get('/plans', listPlanTemplatesHandler);
  fastify.post('/plans', createPlanTemplateHandler);
  fastify.patch('/plans/:planTemplateId', updatePlanTemplateHandler);
  fastify.delete('/plans/:planTemplateId', deletePlanTemplateHandler);

  // Tenant subscriptions overview
  fastify.get('/subscriptions', listTenantSubscriptionsHandler);

  // Customer bootstrap: tenant + admin user
  fastify.post('/customers', createCustomerHandler);

  // Tenant admins management
  fastify.get('/tenant-admins', listTenantAdminsHandler);
  fastify.post('/tenant-admins', createTenantAdminHandler);
  fastify.patch('/tenant-admins/:userId', updateTenantAdminHandler);
  fastify.delete('/tenant-admins/:userId', deleteTenantAdminHandler);

  // Service packages management (sp-admin only)
  fastify.get('/service-packages', getAllServicePackagesHandler);
  fastify.post('/service-packages', createServicePackageHandler);
  fastify.put('/service-packages/:id', updateServicePackageHandler);
  fastify.delete('/service-packages/:id', deleteServicePackageHandler);
}

