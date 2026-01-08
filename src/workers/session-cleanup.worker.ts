/**
 * Session Cleanup Worker
 * 
 * WHY: Periodic cleanup của expired sessions
 * - Run cleanup job mỗi giờ
 * - Expire old sessions
 * - Cleanup orphaned sessions
 */

import { Worker } from 'bullmq';
import { config } from '../infrastructure/config';
import { logger } from '../infrastructure/logger';
import { sessionManager } from '../services/session-manager.service';

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
};

/**
 * Session Cleanup Worker
 * WHY: Process session cleanup jobs
 */
export const sessionCleanupWorker = new Worker(
  'session-cleanup',
  async () => {
    logger.info('Processing session cleanup job...');
    
    const result = await sessionManager.runCleanupJob();
    
    logger.info('Session cleanup completed', result);
    
    return result;
  },
  queueConfig
);

// Worker event handlers
sessionCleanupWorker.on('completed', (job) => {
  logger.info(`Session cleanup job ${job.id} completed`);
});

sessionCleanupWorker.on('failed', (job, err) => {
  logger.error(`Session cleanup job ${job?.id} failed:`, err);
});

/**
 * Schedule cleanup job (run every hour)
 * WHY: Auto-schedule cleanup job khi server start
 */
export async function scheduleCleanupJob() {
  try {
    const { Queue } = await import('bullmq');
    const cleanupQueue = new Queue('session-cleanup', {
      connection: {
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password,
        db: config.redis.db,
      },
    });

    // Check if job already exists
    const repeatableJobs = await cleanupQueue.getRepeatableJobs();
    const existingJob = repeatableJobs.find((job) => job.name === 'cleanup-sessions');

    if (!existingJob) {
      // Schedule recurring job (every hour)
      // WHY: Use cron pattern instead of 'every' for better flexibility
      await cleanupQueue.add(
        'cleanup-sessions',
        {},
        {
          repeat: {
            pattern: '0 * * * *', // Cron: every hour at minute 0
          },
          jobId: 'session-cleanup-recurring',
        }
      );

      logger.info('Session cleanup job scheduled (every hour)');
    } else {
      logger.info('Session cleanup job already scheduled');
    }
  } catch (error) {
    logger.error('Failed to schedule cleanup job:', error);
    // Don't throw - server can still run without cleanup job
  }
}

/**
 * Graceful shutdown
 */
process.on('beforeExit', async () => {
  logger.info('Closing session cleanup worker...');
  await sessionCleanupWorker.close();
});

