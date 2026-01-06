/**
 * Message Queue với BullMQ
 * 
 * WHY: Async message processing
 * - Decouple message sending từ API requests
 * - Retry failed messages
 * - Job prioritization
 * - Rate limiting
 */

import { Queue, QueueEvents } from 'bullmq';
import { logger } from './logger';
import { config } from './config';

/**
 * Queue configuration
 */
const queueConfig = {
  connection: {
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password,
    db: config.redis.db,
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      age: 24 * 3600, // Keep completed jobs for 24 hours
      count: 1000, // Keep last 1000 completed jobs
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // Keep failed jobs for 7 days
    },
  },
};

/**
 * Message Queue
 * WHY: Queue cho message sending
 */
export const messageQueue = new Queue('message-processing', queueConfig);

/**
 * Queue Events
 * WHY: Monitor queue events
 */
export const queueEvents = new QueueEvents('message-processing', queueConfig);

// Setup event listeners
queueEvents.on('completed', ({ jobId }) => {
  logger.info(`Job ${jobId} completed`);
});

queueEvents.on('failed', ({ jobId, failedReason }) => {
  logger.error(`Job ${jobId} failed:`, failedReason);
});

queueEvents.on('progress', ({ jobId, data }) => {
  logger.debug(`Job ${jobId} progress:`, data);
});

/**
 * Queue Health Check
 */
export async function checkQueueHealth(): Promise<boolean> {
  try {
    const waiting = await messageQueue.getWaitingCount();
    const active = await messageQueue.getActiveCount();
    const completed = await messageQueue.getCompletedCount();
    const failed = await messageQueue.getFailedCount();

    logger.info('Queue health:', {
      waiting,
      active,
      completed,
      failed,
    });

    return true;
  } catch (error) {
    logger.error('Queue health check failed:', error);
    return false;
  }
}

/**
 * Graceful shutdown
 */
process.on('beforeExit', async () => {
  logger.info('Closing message queue...');
  await messageQueue.close();
  await queueEvents.close();
});

