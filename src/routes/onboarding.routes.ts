/**
 * Onboarding routes
 * 
 * WHY: API endpoints cho prompt-based onboarding
 */

import { FastifyInstance } from 'fastify';
import {
  onboardFromPromptHandler,
  confirmOnboardingHandler,
} from '../controllers/onboarding.controller';
import { authenticate } from '../middleware/auth';

/**
 * Onboarding routes plugin
 */
export async function onboardingRoutes(fastify: FastifyInstance) {
  // All routes require authentication
  fastify.addHook('preHandler', authenticate);

  // Onboard from prompt
  fastify.post('/', onboardFromPromptHandler);

  // Confirm and execute onboarding
  fastify.post('/confirm', confirmOnboardingHandler);
}

