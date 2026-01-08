/**
 * Analytics routes
 * 
 * WHY: API endpoints cho analytics dashboard
 */

import { FastifyInstance } from 'fastify';
import {
  getMessageStatsHandler,
  getConversationStatsHandler,
  getResponseTimeStatsHandler,
} from '../../controllers/analytics/analytics.controller';
import { authenticate } from '../../middleware/auth';

/**
 * Analytics routes plugin
 */
export async function analyticsRoutes(fastify: FastifyInstance) {
  // All routes require authentication
  fastify.addHook('preHandler', authenticate);

  // Get message statistics
  fastify.get('/messages', getMessageStatsHandler);

  // Get conversation statistics
  fastify.get('/conversations', getConversationStatsHandler);

  // Get response time statistics
  fastify.get('/response-time', getResponseTimeStatsHandler);
}

