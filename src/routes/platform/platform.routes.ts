/**
 * Platform routes
 * 
 * WHY: API endpoints cho platform management
 */

import { FastifyInstance } from 'fastify';
import {
  connectPlatformHandler,
  disconnectPlatformHandler,
  getConnectionsHandler,
  sendMessageHandler,
  getChatsHandler,
} from '../../controllers/platform/platform.controller';
import { authenticate } from '../../middleware/auth';

/**
 * Platform routes plugin
 */
export async function platformRoutes(fastify: FastifyInstance) {
  // All routes require authentication
  fastify.addHook('preHandler', authenticate);

  // Connect platform
  fastify.post('/connect', connectPlatformHandler);

  // Disconnect platform
  fastify.delete('/:connectionId/disconnect', disconnectPlatformHandler);

  // Get connections
  fastify.get('/connections', getConnectionsHandler);

  // Send message
  fastify.post('/send-message', sendMessageHandler);

  // Get chats
  fastify.get('/:connectionId/chats', getChatsHandler);
}

