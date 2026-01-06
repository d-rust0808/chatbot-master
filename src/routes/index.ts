/**
 * Route registration
 * 
 * WHY: Centralized route setup
 * - Organize routes by feature
 * - Register với Fastify
 * - Prefix management
 */

import { FastifyInstance } from 'fastify';
import { authRoutes } from './auth.routes';
import { platformRoutes } from './platform.routes';
import { aiRoutes } from './ai.routes';
import { chatbotRoutes } from './chatbot.routes';
import { analyticsRoutes } from './analytics.routes';
import { conversationRoutes } from './conversation.routes';
import { onboardingRoutes } from './onboarding.routes';
import { adminRoutes } from './admin.routes';

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

  // Health check
  fastify.get('/health', async () => {
    return { status: 'ok', service: 'chatbot-backend' };
  });
}

