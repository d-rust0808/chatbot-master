/**
 * Conversation routes
 * 
 * WHY: API endpoints cho conversation management
 */

import { FastifyInstance } from 'fastify';
import {
  listConversationsHandler,
  getConversationHandler,
  exportConversationHandler,
} from '../../controllers/conversation/conversation.controller';
import { authenticate } from '../../middleware/auth';

/**
 * Conversation routes plugin
 */
export async function conversationRoutes(fastify: FastifyInstance) {
  // All routes require authentication
  fastify.addHook('preHandler', authenticate);

  // List conversations
  fastify.get('/', listConversationsHandler);

  // Get conversation details
  fastify.get('/:conversationId', getConversationHandler);

  // Export conversation
  fastify.get('/:conversationId/export', exportConversationHandler);
}

