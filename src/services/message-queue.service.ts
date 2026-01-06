/**
 * Message Queue Service
 * 
 * WHY: High-level service để enqueue messages
 * - Abstract queue operations
 * - Job prioritization
 * - Error handling
 */

import { messageQueue } from '../infrastructure/queue';
import { logger } from '../infrastructure/logger';

export interface EnqueueMessageOptions {
  connectionId: string;
  chatId: string;
  message: string;
  options?: Record<string, unknown>;
  priority?: number; // Higher = more priority
  delay?: number; // Delay in milliseconds
}

/**
 * Message Queue Service
 * WHY: Centralized message queue operations
 */
export class MessageQueueService {
  /**
   * Enqueue message để send
   * WHY: Async message sending với retry
   */
  async enqueueMessage(data: EnqueueMessageOptions): Promise<string> {
    try {
      const job = await messageQueue.add(
        'send-message',
        {
          connectionId: data.connectionId,
          chatId: data.chatId,
          message: data.message,
          options: data.options,
        },
        {
          priority: data.priority || 0,
          delay: data.delay || 0,
          jobId: `${data.connectionId}-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        }
      );

      logger.info('Message enqueued', {
        jobId: job.id,
        connectionId: data.connectionId,
        chatId: data.chatId,
      });

      return job.id!;
    } catch (error) {
      logger.error('Failed to enqueue message:', error);
      throw error;
    }
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId: string) {
    try {
      const job = await messageQueue.getJob(jobId);
      if (!job) {
        return null;
      }

      const state = await job.getState();
      const progress = job.progress;

      return {
        id: job.id,
        state,
        progress,
        data: job.data,
        returnvalue: job.returnvalue,
        failedReason: job.failedReason,
        timestamp: job.timestamp,
        processedOn: job.processedOn,
        finishedOn: job.finishedOn,
      };
    } catch (error) {
      logger.error('Failed to get job status:', error);
      throw error;
    }
  }

  /**
   * Cancel job
   */
  async cancelJob(jobId: string): Promise<void> {
    try {
      const job = await messageQueue.getJob(jobId);
      if (job) {
        await job.remove();
        logger.info(`Job ${jobId} cancelled`);
      }
    } catch (error) {
      logger.error('Failed to cancel job:', error);
      throw error;
    }
  }

  /**
   * Get queue stats
   */
  async getQueueStats() {
    try {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        messageQueue.getWaitingCount(),
        messageQueue.getActiveCount(),
        messageQueue.getCompletedCount(),
        messageQueue.getFailedCount(),
        messageQueue.getDelayedCount(),
      ]);

      return {
        waiting,
        active,
        completed,
        failed,
        delayed,
        total: waiting + active + completed + failed + delayed,
      };
    } catch (error) {
      logger.error('Failed to get queue stats:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const messageQueueService = new MessageQueueService();

