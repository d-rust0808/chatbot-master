/**
 * Chatbot routes
 * 
 * WHY: API endpoints cho chatbot management
 */

import { FastifyInstance } from 'fastify';
import {
  createChatbotHandler,
  updateChatbotHandler,
  getChatbotHandler,
  listChatbotsHandler,
  getAvailableModelsHandler,
} from '../controllers/chatbot.controller';
import {
  testSingleModelHandler,
  testAllModelsHandler,
} from '../controllers/model-test.controller';
import { authenticate } from '../middleware/auth';

/**
 * Chatbot routes plugin
 */
export async function chatbotRoutes(fastify: FastifyInstance) {
  // Get available models (public info, no auth needed)
  fastify.get('/models', getAvailableModelsHandler);

  // Test models (public, no auth needed)
  fastify.get('/models/test', testAllModelsHandler);
  fastify.get('/models/:modelName/test', testSingleModelHandler);

  // All other routes require authentication
  fastify.addHook('preHandler', authenticate);

  // Create chatbot
  fastify.post('/', createChatbotHandler);

  // List chatbots
  fastify.get('/', listChatbotsHandler);

  // Get chatbot
  fastify.get('/:chatbotId', getChatbotHandler);

  // Update chatbot
  fastify.patch('/:chatbotId', updateChatbotHandler);
  fastify.put('/:chatbotId', updateChatbotHandler);
}

