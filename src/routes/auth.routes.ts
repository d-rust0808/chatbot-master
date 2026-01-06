/**
 * Authentication routes
 * 
 * WHY: Route definitions
 * - HTTP method + path
 * - Middleware (auth, validation)
 * - Controller handlers
 */

import { FastifyInstance } from 'fastify';
import {
  registerHandler,
  loginHandler,
  refreshTokenHandler,
  logoutHandler,
} from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';

/**
 * Auth routes plugin
 */
export async function authRoutes(fastify: FastifyInstance) {
  // Public routes
  fastify.post('/register', registerHandler);
  fastify.post('/login', loginHandler);
  fastify.post('/refresh', refreshTokenHandler);

  // Protected routes (require authentication)
  fastify.post('/logout', { preHandler: authenticate }, logoutHandler);
}

