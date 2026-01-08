/**
 * Message Processing Worker
 * 
 * WHY: Process messages từ queue
 * - Send messages via platform adapters
 * - Handle retries
 * - Error handling
 */

import { Worker, Job } from 'bullmq';
import { config } from '../infrastructure/config';
import { logger } from '../infrastructure/logger';
import { platformManager } from '../services/platform/platform-manager.service';

/**
 * Message job data
 */
interface MessageJobData {
  connectionId: string;
  chatId: string;
  message: string;
  options?: Record<string, unknown>;
}

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
  concurrency: 5, // Process 5 messages concurrently
};

/**
 * Message Worker
 * WHY: Process message sending jobs
 */
export const messageWorker = new Worker<MessageJobData>(
  'message-processing',
  async (job: Job<MessageJobData>) => {
    const { connectionId, chatId, message, options } = job.data;

    logger.info('Processing message job', {
      jobId: job.id,
      connectionId,
      chatId,
      messageLength: message.length,
    });

    try {
      // Update job progress
      await job.updateProgress(10);

      // Get platform connection
      const connection = await platformManager.getConnection(connectionId);
      if (!connection) {
        throw new Error(`Connection ${connectionId} not found`);
      }

      await job.updateProgress(30);

      // Send message via platform manager
      await platformManager.sendMessage(connectionId, chatId, message, options);

      await job.updateProgress(100);

      logger.info('Message sent successfully', {
        jobId: job.id,
        connectionId,
        chatId,
      });

      return { success: true, connectionId, chatId };
    } catch (error) {
      logger.error('Failed to process message job:', {
        jobId: job.id,
        connectionId,
        chatId,
        error: error instanceof Error ? error.message : error,
      });

      // Re-throw để BullMQ handle retry
      throw error;
    }
  },
  queueConfig
);

// Worker event handlers
messageWorker.on('completed', (job) => {
  logger.info(`Message job ${job.id} completed`);
});

messageWorker.on('failed', (job, err) => {
  logger.error(`Message job ${job?.id} failed:`, err);
});

messageWorker.on('error', (err) => {
  logger.error('Message worker error:', err);
});

/**
 * Graceful shutdown
 */
process.on('beforeExit', async () => {
  logger.info('Closing message worker...');
  await messageWorker.close();
});

