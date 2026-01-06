/**
 * Cache Service
 * 
 * WHY: Redis caching cho frequently accessed data
 * - Chatbot configs
 * - Conversation summaries
 * - Model availability
 * - Platform connection status
 * - Reduce database load
 */

import { redis } from '../infrastructure/redis';
import { logger } from '../infrastructure/logger';

/**
 * Cache Service
 * WHY: Centralized caching với Redis
 */
export class CacheService {
  private readonly defaultTTL = 3600; // 1 hour

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await redis.get(key);
      if (!value) {
        return null;
      }
      return JSON.parse(value) as T;
    } catch (error) {
      logger.error('Cache get error:', { key, error });
      return null;
    }
  }

  /**
   * Set value in cache
   */
  async set(key: string, value: unknown, ttl: number = this.defaultTTL): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      await redis.setex(key, ttl, serialized);
    } catch (error) {
      logger.error('Cache set error:', { key, error });
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<void> {
    try {
      await redis.del(key);
    } catch (error) {
      logger.error('Cache delete error:', { key, error });
    }
  }

  /**
   * Delete multiple keys
   */
  async deleteMany(keys: string[]): Promise<void> {
    if (keys.length === 0) return;

    try {
      await redis.del(...keys);
    } catch (error) {
      logger.error('Cache deleteMany error:', { keys, error });
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await redis.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Cache exists error:', { key, error });
      return false;
    }
  }

  /**
   * Get or set pattern (cache-aside)
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = this.defaultTTL
  ): Promise<T> {
    // Try to get from cache
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Fetch from source
    const value = await fetcher();

    // Store in cache
    await this.set(key, value, ttl);

    return value;
  }

  /**
   * Invalidate cache by pattern
   */
  async invalidatePattern(pattern: string): Promise<void> {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await this.deleteMany(keys);
        logger.info('Cache invalidated', { pattern, count: keys.length });
      }
    } catch (error) {
      logger.error('Cache invalidatePattern error:', { pattern, error });
    }
  }

  /**
   * Cache keys for chatbot
   */
  chatbotKey(tenantId: string, chatbotId: string): string {
    return `chatbot:${tenantId}:${chatbotId}`;
  }

  /**
   * Cache key for conversation summary
   */
  conversationSummaryKey(conversationId: string): string {
    return `conversation:summary:${conversationId}`;
  }

  /**
   * Cache key for model availability
   */
  modelAvailabilityKey(): string {
    return 'models:availability';
  }

  /**
   * Cache key for platform connection status
   */
  platformConnectionKey(connectionId: string): string {
    return `platform:connection:${connectionId}`;
  }

  /**
   * Invalidate chatbot cache
   */
  async invalidateChatbot(tenantId: string, chatbotId: string): Promise<void> {
    await this.delete(this.chatbotKey(tenantId, chatbotId));
    await this.invalidatePattern(`chatbot:${tenantId}:*`);
  }

  /**
   * Invalidate conversation cache
   */
  async invalidateConversation(conversationId: string): Promise<void> {
    await this.delete(this.conversationSummaryKey(conversationId));
    await this.invalidatePattern(`conversation:${conversationId}:*`);
  }

  /**
   * Invalidate platform connection cache
   */
  async invalidatePlatformConnection(connectionId: string): Promise<void> {
    await this.delete(this.platformConnectionKey(connectionId));
  }
}

// Export singleton instance
export const cacheService = new CacheService();

