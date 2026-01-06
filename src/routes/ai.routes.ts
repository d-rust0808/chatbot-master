/**
 * AI routes
 * 
 * WHY: API endpoints cho AI operations
 */

import { FastifyInstance } from 'fastify';
import {
  generateResponseHandler,
  checkBalanceHandler,
  getLogsHandler,
} from '../controllers/ai.controller';
import { authenticate } from '../middleware/auth';

/**
 * AI routes plugin
 */
export async function aiRoutes(fastify: FastifyInstance) {
  // All routes require authentication
  fastify.addHook('preHandler', authenticate);

  // Generate AI response
  fastify.post('/generate', generateResponseHandler);

  // Check proxy balance (admin only - có thể thêm role check sau)
  fastify.get('/balance', checkBalanceHandler);

  // Get API logs (admin only)
  fastify.get('/logs', getLogsHandler);
}

