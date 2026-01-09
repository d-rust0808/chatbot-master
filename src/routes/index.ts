/**
 * Route registration
 * 
 * WHY: Centralized route setup
 * - Organize routes by feature
 * - Register với Fastify
 * - Prefix management
 */

import { FastifyInstance } from 'fastify';
import { authRoutes } from './auth/auth.routes';
import { platformRoutes } from './platform/platform.routes';
import { aiRoutes } from './ai/ai.routes';
import { chatbotRoutes } from './chatbot/chatbot.routes';
import { analyticsRoutes } from './analytics/analytics.routes';
import { conversationRoutes } from './conversation/conversation.routes';
import { onboardingRoutes } from './onboarding/onboarding.routes';
import { adminRoutes } from './admin.routes';
import { catalogRoutes } from './catalog/catalog.routes';
import { billingRoutes } from './billing/billing.routes';
import { paymentRoutes } from './payment/payment.routes';
import { sepayWebhookHandler } from '../controllers/payment/payment.controller';
import { tenantServiceRoutes } from './tenant-service/tenant-service.routes';
import { creditRoutes } from './wallet/credit.routes';
import { servicePackageRoutes } from './service-package/service-package.routes';

/**
 * Setup all routes
 */
export async function setupRoutes(fastify: FastifyInstance) {
  // Register auth routes
  await fastify.register(authRoutes, { prefix: '/auth' });

  // Register chatbot routes
  await fastify.register(chatbotRoutes, { prefix: '/chatbots' });

  // Register platform routes
  await fastify.register(platformRoutes, { prefix: '/platforms' });

  // Register AI routes
  await fastify.register(aiRoutes, { prefix: '/ai' });

  // Register analytics routes
  await fastify.register(analyticsRoutes, { prefix: '/analytics' });

  // Register conversation routes
  await fastify.register(conversationRoutes, { prefix: '/conversations' });

  // Register onboarding routes
  await fastify.register(onboardingRoutes, { prefix: '/onboarding' });

  // Register admin routes (sp-admin)
  // WHY: Log route registration để debug
  const { logger } = await import('../infrastructure/logger');
  logger.info('Registering admin routes', { prefix: '/sp-admin' });
  await fastify.register(adminRoutes, { prefix: '/sp-admin' });
  logger.info('Admin routes registered successfully');

  // Register admin routes (tenant admin - requireAdmin role)
  await fastify.register(catalogRoutes, { prefix: '/admin' });
  await fastify.register(billingRoutes, { prefix: '/admin' });
  await fastify.register(tenantServiceRoutes, { prefix: '/admin' });

  // WHY: Webhook endpoint phải được đăng ký TRƯỚC payment routes
  // - Tránh bị ảnh hưởng bởi middleware auth trong payment routes
  // - Webhook là public endpoint, không cần authentication
  fastify.post('/sp-admin/payments/webhook/sepay', sepayWebhookHandler);

  // Register payment routes
  // - Admin endpoints (tenant admin) → /admin/payments
  // - Super admin endpoints → /sp-admin/payments
  await fastify.register(paymentRoutes, { prefix: '/admin/payments' });
  
  // Register super admin payment routes (separate)
  await fastify.register(async function (fastify) {
    const { authenticate } = await import('../middleware/auth');
    const { requireSuperAdmin } = await import('../middleware/role-check');
    const { getAllPaymentsHandler, manualCompletePaymentHandler } = await import('../controllers/payment/payment.controller');
    
    fastify.addHook('preHandler', authenticate);
    fastify.addHook('preHandler', requireSuperAdmin);
    
    // Get all payments (super admin only)
    fastify.get('/all', getAllPaymentsHandler);
    
    // Manual complete payment (super admin only)
    fastify.post('/:id/manual-complete', manualCompletePaymentHandler);
  }, { prefix: '/sp-admin/payments' });

  // Register credit routes
  await fastify.register(creditRoutes, { prefix: '/credits' });

  // Register service package routes
  await fastify.register(servicePackageRoutes, { prefix: '/service-packages' });

  // Health check
  fastify.get('/health', async () => {
    return { status: 'ok', service: 'chatbot-backend' };
  });
}

