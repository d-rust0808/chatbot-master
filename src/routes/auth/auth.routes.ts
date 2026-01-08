/**
 * Authentication routes
 * 
 * WHY: Route definitions
 * - HTTP method + path
 * - Middleware (auth, validation)
 * - Controller handlers
 */

import { FastifyInstance } from 'fastify';
import { loginHandler, refreshTokenHandler, logoutHandler } from '../../controllers/auth/auth.controller';
import { authenticate } from '../../middleware/auth';

/**
 * Auth routes plugin
 */
export async function authRoutes(fastify: FastifyInstance) {
  // Public routes
  // NOTE: Register endpoint DISABLED - chỉ sp-admin tạo admin accounts qua admin API
  // fastify.post('/register', registerHandler); // Disabled - use /admin/create-admin instead
  
  fastify.post('/login', loginHandler);
  fastify.post('/refresh', refreshTokenHandler);

  // Protected routes (require authentication)
  fastify.post('/logout', { preHandler: authenticate }, logoutHandler);
}

