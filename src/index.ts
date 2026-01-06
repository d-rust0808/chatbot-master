/**
 * Main entry point for Chatbot SaaS Backend
 * 
 * Architecture: Layered Architecture
 * - Routes → Controllers → Services → Infrastructure
 * - Multi-tenant support with middleware
 * - JWT authentication
 */

import Fastify from 'fastify';
import { config } from './infrastructure/config';
import { logger } from './infrastructure/logger';
import { setupRoutes } from './routes';
import { errorHandler } from './infrastructure/error-handler';
import { tenantMiddleware } from './middleware/tenant';
import { rateLimitMiddleware } from './middleware/rate-limit';
import { performHealthCheck } from './infrastructure/health-check';
import { webSocketServer } from './infrastructure/websocket';
import './workers/message.worker'; // Start message worker
import { scheduleCleanupJob } from './workers/session-cleanup.worker';
import './workers/session-cleanup.worker'; // Start session cleanup worker

// Initialize Fastify instance
const app = Fastify({
  logger: false, // We use Winston instead
  requestIdLogLabel: 'reqId',
  requestIdHeader: 'x-request-id',
});

// Register error handler
app.setErrorHandler(errorHandler);

// Register middleware
app.register(tenantMiddleware);

// Register rate limiting (after tenant middleware to have tenant context)
app.addHook('onRequest', async (request, reply) => {
  await rateLimitMiddleware(request, reply);
});

// Register routes
app.register(setupRoutes, { prefix: '/api/v1' });

// Health check endpoint
app.get('/health', async (_request, reply) => {
  const healthCheck = await performHealthCheck();
  
  const statusCode = healthCheck.status === 'healthy' ? 200 : 
                     healthCheck.status === 'degraded' ? 200 : 503;
  
  return reply.status(statusCode).send(healthCheck);
});
// Start server
const start = async () => {
  try {
    const port = config.port;
    const host = config.host;
    
    // Schedule session cleanup job
    await scheduleCleanupJob();
    
    // Start Fastify server
    await app.listen({ port, host });
    
    // Initialize WebSocket server với Fastify's HTTP server
    const httpServer = app.server;
    webSocketServer.initialize(httpServer);
    
    logger.info(`🚀 Server running on http://${host}:${port}`);
    logger.info(`📚 API docs available at http://${host}:${port}/api/v1/docs`);
    logger.info(`🔌 WebSocket server available at ws://${host}:${port}/socket.io`);
    logger.info(`✅ Message queue worker started`);
    logger.info(`✅ Session cleanup worker started`);
  } catch (err) {
    logger.error('Error starting server:', err);
    process.exit(1);
  }
};

start();

