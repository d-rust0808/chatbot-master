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

  // Register admin routes
  await fastify.register(adminRoutes, { prefix: '/admin' });

  // Register catalog routes (tenant-level)
  await fastify.register(catalogRoutes);

  // Register billing routes (tenant-level)
  await fastify.register(billingRoutes);

  // Register tenant service & workflow routes (tenant-level)
  await fastify.register(tenantServiceRoutes);

  // Register payment routes (admin only)
  await fastify.register(paymentRoutes, { prefix: '/admin/payments' });

  // Register credit routes
  await fastify.register(creditRoutes, { prefix: '/credits' });

  // Register service package routes
  await fastify.register(servicePackageRoutes, { prefix: '/service-packages' });

  // Health check
  fastify.get('/health', async () => {
    return { status: 'ok', service: 'chatbot-backend' };
  });
}

