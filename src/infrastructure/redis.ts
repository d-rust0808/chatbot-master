/**
 * Redis client for caching and queues
 * 
 * WHY: Centralized Redis connection
 * - Reuse connection
 * - Error handling
 * - Ready for BullMQ integration
 */

import Redis from 'ioredis';
import { logger } from './logger';
import { config } from './config';

// Create Redis client
// WHY: Support connection pooling và database selection
export const redis = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  db: config.redis.db,
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  // Connection pool options
  enableReadyCheck: true,
  enableOfflineQueue: false,
});

// Event handlers
redis.on('connect', () => {
  logger.info('Redis connected');
});

redis.on('error', (err) => {
  logger.error('Redis error:', err);
});

redis.on('close', () => {
  logger.warn('Redis connection closed');
});

// Graceful shutdown
process.on('beforeExit', async () => {
  await redis.quit();
  logger.info('Redis connection closed');
});

