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
import { checkIPMiddleware } from './middleware/ip-check';
import { accessLogMiddleware, accessLogResponseHook } from './middleware/access-log';
import { performHealthCheck } from './infrastructure/health-check';
import { webSocketServer } from './infrastructure/websocket';
import { bootstrapAdmin } from './infrastructure/bootstrap-admin';
import './workers/message.worker'; // Start message worker
import { scheduleCleanupJob } from './workers/session-cleanup.worker';
import './workers/session-cleanup.worker'; // Start session cleanup worker
import { startPaymentExpiryWorker } from './workers/payment/payment-expiry.worker';
import fastifyStatic from '@fastify/static';
import * as path from 'path';

// Initialize Fastify instance
const app = Fastify({
  logger: false, // We use Winston instead
  requestIdLogLabel: 'reqId',
  requestIdHeader: 'x-request-id',
});

// Register error handler
app.setErrorHandler(errorHandler);

// Add default metadata to all JSON responses
app.addHook('preSerialization', (_request, _reply, payload, done) => {
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    const obj = payload as Record<string, unknown>;
    if (!('api_version' in obj)) {
      obj.api_version = 'v1';
    }
    if (!('provider' in obj)) {
      obj.provider = 'cdudu';
    }
    return done(null, obj);
  }
  return done(null, payload);
});

// Register middleware
app.register(tenantMiddleware);

// Serve static files (uploads)
app.register(fastifyStatic, {
  root: path.join(process.cwd(), 'public'),
  prefix: '/', // Serve files at /uploads/...
});

// Simple CORS cho dev: cho phép tất cả origin
// WARNING: Không dùng cấu hình này cho production
app.addHook('onRequest', async (request, reply) => {
  // Set CORS headers first (cho tất cả requests)
  reply.header('Access-Control-Allow-Origin', '*');
  reply.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  reply.header(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Tenant-Id, X-Tenant-Slug, x-tenant-slug, X-Requested-With'
  );
  reply.header('Access-Control-Max-Age', '86400'); // 24 hours

  // Handle OPTIONS preflight request (phải return sớm)
  if (request.method === 'OPTIONS') {
    logger.debug('OPTIONS preflight request', { url: request.url });
    return reply.status(204).send();
  }

  // WHY: Log tất cả requests để debug routing issues (skip OPTIONS)
  logger.info('Incoming request', {
    method: request.method,
    url: request.url,
    path: (request as any).routeOptions?.url || request.url,
    contentType: request.headers['content-type'],
    hasAuth: !!request.headers.authorization,
    origin: request.headers.origin,
    userAgent: request.headers['user-agent']?.substring(0, 50),
    ip: request.ip,
  });

  // IP check (block blacklisted IPs early)
  await checkIPMiddleware(request, reply);
  if (reply.sent) {
    return; // IP was blocked, stop processing
  }

  // Rate limiting (sau khi set CORS headers)
  await rateLimitMiddleware(request, reply);
});

// Register access log middleware (sau CORS, để không block OPTIONS)
app.addHook('onRequest', accessLogMiddleware);

// Register access log response hook (log sau khi response sent)
app.addHook('onSend', accessLogResponseHook);

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
    
    // Bootstrap admin user (if configured)
    await bootstrapAdmin();
    
    // Schedule session cleanup job
    await scheduleCleanupJob();
    
    // Start payment expiry worker
    startPaymentExpiryWorker();
    
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

