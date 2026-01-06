/**
 * Session Manager Service
 * 
 * WHY: Quản lý platform sessions
 * - Session validation
 * - Session expiration
 * - Session cleanup
 */

import { prisma } from '../infrastructure/database';
import { logger } from '../infrastructure/logger';
import { platformManager } from './platform-manager.service';

/**
 * Session expiration time (7 days)
 */
const SESSION_EXPIRATION_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Session Manager Service
 * WHY: Centralized session management
 */
export class SessionManagerService {
  /**
   * Validate session
   * WHY: Check if session is still valid
   */
  async validateSession(connectionId: string): Promise<boolean> {
    try {
      const connection = await prisma.platformConnection.findUnique({
        where: { id: connectionId },
      });

      if (!connection) {
        return false;
      }

      // Check if expired
      if (connection.lastSyncAt) {
        const age = Date.now() - connection.lastSyncAt.getTime();
        if (age > SESSION_EXPIRATION_MS) {
          logger.warn(`Session ${connectionId} expired`, {
            age: age / (24 * 60 * 60 * 1000), // days
          });
          return false;
        }
      }

      // Check if adapter is connected
      const adapter = platformManager.getAdapter(connectionId);
      if (!adapter || !adapter.isConnected()) {
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Failed to validate session:', error);
      return false;
    }
  }

  /**
   * Check và expire old sessions
   * WHY: Cleanup expired sessions
   */
  async expireOldSessions(): Promise<number> {
    try {
      const expiredThreshold = new Date(Date.now() - SESSION_EXPIRATION_MS);

      const expiredConnections = await prisma.platformConnection.findMany({
        where: {
          lastSyncAt: {
            lt: expiredThreshold,
          },
          status: {
            in: ['connected', 'connecting'],
          },
        },
      });

      let expiredCount = 0;

      for (const connection of expiredConnections) {
        try {
          // Disconnect adapter
          await platformManager.disconnectPlatform(connection.id);

          // Update status
          await prisma.platformConnection.update({
            where: { id: connection.id },
            data: {
              status: 'disconnected',
            },
          });

          expiredCount++;
          logger.info(`Expired session ${connection.id}`);
        } catch (error) {
          logger.error(`Failed to expire session ${connection.id}:`, error);
        }
      }

      if (expiredCount > 0) {
        logger.info(`Expired ${expiredCount} sessions`);
      }

      return expiredCount;
    } catch (error) {
      logger.error('Failed to expire old sessions:', error);
      return 0;
    }
  }

  /**
   * Cleanup orphaned sessions
   * WHY: Remove sessions không còn adapter instance
   */
  async cleanupOrphanedSessions(): Promise<number> {
    try {
      const activeConnections = await prisma.platformConnection.findMany({
        where: {
          status: {
            in: ['connected', 'connecting'],
          },
        },
      });

      let cleanedCount = 0;

      for (const connection of activeConnections) {
        const adapter = platformManager.getAdapter(connection.id);
        if (!adapter) {
          // Adapter không tồn tại nhưng status vẫn là connected
          await prisma.platformConnection.update({
            where: { id: connection.id },
            data: {
              status: 'disconnected',
            },
          });

          cleanedCount++;
          logger.info(`Cleaned orphaned session ${connection.id}`);
        }
      }

      if (cleanedCount > 0) {
        logger.info(`Cleaned ${cleanedCount} orphaned sessions`);
      }

      return cleanedCount;
    } catch (error) {
      logger.error('Failed to cleanup orphaned sessions:', error);
      return 0;
    }
  }

  /**
   * Update session last sync time
   * WHY: Keep session alive
   */
  async updateLastSync(connectionId: string): Promise<void> {
    try {
      await prisma.platformConnection.update({
        where: { id: connectionId },
        data: {
          lastSyncAt: new Date(),
        },
      });
    } catch (error) {
      logger.error('Failed to update last sync:', error);
    }
  }

  /**
   * Run cleanup job
   * WHY: Periodic cleanup của expired và orphaned sessions
   */
  async runCleanupJob(): Promise<{ expired: number; orphaned: number }> {
    logger.info('Running session cleanup job...');

    const [expired, orphaned] = await Promise.all([
      this.expireOldSessions(),
      this.cleanupOrphanedSessions(),
    ]);

    logger.info('Session cleanup job completed', { expired, orphaned });

    return { expired, orphaned };
  }
}

// Export singleton instance
export const sessionManager = new SessionManagerService();

