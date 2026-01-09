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
// Use existing admin controller with image upload support
import {
  createServicePackageHandler,
  updateServicePackageHandler,
  deleteServicePackageHandler,
  getAllServicePackagesHandler,
  getServicePackageByIdAdminHandler,
} from '../controllers/service-package/admin.controller';
import { authenticate } from '../middleware/auth';
import { requireSuperAdmin } from '../middleware/role-check';
import multipart from '@fastify/multipart';

/**
 * Admin routes plugin
 */
export async function adminRoutes(fastify: FastifyInstance) {
  const { logger } = await import('../infrastructure/logger');
  logger.info('Admin routes plugin initialized');
  
  // Register multipart for file uploads
  await fastify.register(multipart, {
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB max
    },
  });
  logger.info('Multipart plugin registered');

  // Create admin endpoint (public, for first-time setup)
  fastify.post('/create-admin', createAdminHandler);

  // All other routes require authentication + super admin role
  // WHY: Log all admin requests để debug routing issues
  fastify.addHook('onRequest', async (request) => {
    const { logger } = await import('../infrastructure/logger');
    logger.info('Admin route request', {
      method: request.method,
      url: request.url,
      path: request.routerPath,
      contentType: request.headers['content-type'],
      hasAuth: !!request.headers.authorization,
      origin: request.headers.origin,
    });
  });
  
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
  // GET all - uses admin controller (supports filters)
  fastify.get('/service-packages', getAllServicePackagesHandler);
  // GET by ID - uses service-package controller
  fastify.get('/service-packages/:id', getServicePackageByIdAdminHandler);
  // POST create - uses admin controller (supports multipart/form-data for image)
  // WHY: Log request để debug khi không nhận được request
  fastify.post('/service-packages', async (request, reply) => {
    const { logger } = await import('../infrastructure/logger');
    logger.info('POST /service-packages route matched and handler called', {
      method: request.method,
      url: request.url,
      routerPath: request.routerPath,
      contentType: request.headers['content-type'],
      hasAuth: !!request.headers.authorization,
      isMultipart: request.isMultipart(),
      origin: request.headers.origin,
    });
    return createServicePackageHandler(request, reply);
  });
  
  // WHY: Test endpoint để verify route registration
  fastify.get('/service-packages/test', async (request, reply) => {
    const { logger } = await import('../infrastructure/logger');
    logger.info('Test endpoint called', { url: request.url });
    return reply.send({ 
      success: true, 
      message: 'Admin routes are working',
      timestamp: new Date().toISOString(),
    });
  });
  // PUT update - uses admin controller (supports multipart/form-data for image)
  fastify.put('/service-packages/:id', updateServicePackageHandler);
  // DELETE - uses admin controller
  fastify.delete('/service-packages/:id', deleteServicePackageHandler);
}

