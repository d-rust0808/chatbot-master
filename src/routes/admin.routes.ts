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
  topUpUserBalanceHandler,
  getAdminBalanceLogsHandler,
  getAllAdminBalanceLogsHandler,
} from '../controllers/admin/admin.controller';
import {
  getSystemConfigHandler,
  updateSystemConfigHandler,
  initializeSystemConfigsHandler,
} from '../controllers/admin/system-config.controller';
import {
  listAIModelsHandler,
  getAIModelHandler,
  createAIModelHandler,
  updateAIModelHandler,
  deleteAIModelHandler,
} from '../controllers/admin/ai-model.controller';
import {
  listAILogsHandler,
  getSuspiciousIPsHandler,
} from '../controllers/admin/ai-log.controller';
import {
  listAccessLogsHandler,
  getSuspiciousIPsHandler as getAccessLogSuspiciousIPsHandler,
  getIPDetailsHandler,
  banIPFromSuspiciousHandler,
} from '../controllers/admin/access-log.controller';
import {
  addToBlacklistHandler,
  removeFromBlacklistHandler,
  getBlacklistHandler,
  addToWhitelistHandler,
  removeFromWhitelistHandler,
  getWhitelistHandler,
  banIPHandler,
  unbanIPHandler,
  toggleBlacklistStatusHandler,
  toggleWhitelistStatusHandler,
} from '../controllers/admin/ip-management.controller';
import { checkBalanceHandler } from '../controllers/ai/ai.controller';
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
  // WHY: Config multipart với các options để tránh hang
  await fastify.register(multipart, {
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB max
      files: 1, // Max 1 file
      fields: 10, // Max 10 fields
    },
    attachFieldsToBody: false, // Don't auto-attach, we'll parse manually
    sharedSchemaId: 'MultipartFileType', // Shared schema
  });
  logger.info('Multipart plugin registered', {
    maxFileSize: '5MB',
    maxFiles: 1,
    maxFields: 10,
  });

  // Create admin endpoint (public, for first-time setup)
  fastify.post('/create-admin', createAdminHandler);

  // All other routes require authentication + super admin role
  // WHY: Log all admin requests để debug routing issues
  fastify.addHook('onRequest', async (request) => {
    const { logger } = await import('../infrastructure/logger');
    logger.info('Admin route request', {
      method: request.method,
      url: request.url,
      path: (request as any).routeOptions?.url || request.url,
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
  
  // Top-up user balance (sp-admin only)
  fastify.post('/users/:userId/top-up', topUpUserBalanceHandler);
  
  // Get admin balance logs (sp-admin only)
  // - Get logs for specific admin
  fastify.get('/users/:adminId/balance-logs', getAdminBalanceLogsHandler);
  
  // Get all admin balance logs (sp-admin only)
  // - Get logs for all admins (can filter by adminId query param)
  fastify.get('/balance-logs', getAllAdminBalanceLogsHandler);

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
    const startTime = Date.now();
    
    logger.info('POST /service-packages route matched and handler called', {
      method: request.method,
      url: request.url,
      routerPath: request.routerPath,
      contentType: request.headers['content-type'],
      hasAuth: !!request.headers.authorization,
      isMultipart: request.isMultipart(),
      origin: request.headers.origin,
    });
    
    try {
      const result = await createServicePackageHandler(request, reply);
      const duration = Date.now() - startTime;
      logger.info('POST /service-packages completed', {
        duration: `${duration}ms`,
        statusCode: reply.statusCode,
      });
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('POST /service-packages failed', {
        duration: `${duration}ms`,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
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

  // AI Config management (sp-admin only)
  // WHY: SP-Admin quản lý AI configurations (API keys, models, logs)
  // Chỉ giữ lại các API cần thiết cho AI Config
  fastify.get('/system-configs/:category/:key', getSystemConfigHandler);
  fastify.patch('/system-configs/:category/:key', updateSystemConfigHandler);
  fastify.post('/system-configs/initialize', initializeSystemConfigsHandler);

  // AI Models management (sp-admin only)
  // WHY: SP-Admin quản lý AI models (thêm/sửa/xóa)
  fastify.get('/ai-models', listAIModelsHandler);
  fastify.get('/ai-models/:name', getAIModelHandler);
  fastify.post('/ai-models', createAIModelHandler);
  fastify.patch('/ai-models/:name', updateAIModelHandler);
  fastify.delete('/ai-models/:name', deleteAIModelHandler);

  // AI Balance (sp-admin only)
  // WHY: SP-Admin xem proxy balance từ v98store
  fastify.get('/ai/balance', checkBalanceHandler);

  // AI Logs management (sp-admin only)
  // WHY: SP-Admin xem AI request logs và monitor suspicious IPs
  fastify.get('/ai-logs', listAILogsHandler);
  fastify.get('/ai-logs/suspicious-ips', getSuspiciousIPsHandler);

  // IP Management (sp-admin only)
  // WHY: SP-Admin quản lý IP blacklist/whitelist
  // Blacklist
  fastify.get('/ip-management/blacklist', getBlacklistHandler);
  fastify.post('/ip-management/blacklist', addToBlacklistHandler);
  fastify.delete('/ip-management/blacklist/:ipAddress', removeFromBlacklistHandler);
  fastify.patch('/ip-management/blacklist/:ipAddress/toggle', toggleBlacklistStatusHandler);
  
  // Whitelist
  fastify.get('/ip-management/whitelist', getWhitelistHandler);
  fastify.post('/ip-management/whitelist', addToWhitelistHandler);
  fastify.delete('/ip-management/whitelist/:ipAddress', removeFromWhitelistHandler);
  fastify.patch('/ip-management/whitelist/:ipAddress/toggle', toggleWhitelistStatusHandler);
  
  // Ban/Unban (aliases)
  fastify.post('/ip-management/ban', banIPHandler);
  fastify.delete('/ip-management/ban/:ipAddress', unbanIPHandler);

  // Access Logs (sp-admin only)
  // WHY: SP-Admin xem access logs và suspicious IPs
  fastify.get('/access-logs', listAccessLogsHandler);
  fastify.get('/access-logs/suspicious', getAccessLogSuspiciousIPsHandler);
  fastify.get('/access-logs/ip/:ipAddress', getIPDetailsHandler);
  fastify.post('/access-logs/ip/:ipAddress/ban', banIPFromSuspiciousHandler);
}

