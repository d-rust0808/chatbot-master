/**
 * Base Platform Adapter
 * 
 * WHY: Common functionality cho tất cả adapters
 * - Event handling
 * - Status management
 * - Error handling
 * - Session management
 */

import { EventEmitter } from 'events';
import type { IPlatformAdapter } from './platform-adapter.interface';
import type {
  PlatformType,
  ConnectionStatus,
  PlatformMessage,
  PlatformChat,
  PlatformConnectionConfig,
} from '../types/platform';
import { logger } from '../infrastructure/logger';
import { retryWithBackoff, type RetryOptions } from '../utils/retry';
import { circuitBreakerManager } from '../utils/circuit-breaker';

/**
 * Base class cho Platform Adapters
 * WHY: DRY principle, common functionality
 */
export abstract class BasePlatformAdapter extends EventEmitter implements IPlatformAdapter {
  protected _status: ConnectionStatus = 'disconnected';
  protected config?: PlatformConnectionConfig;
  protected circuitBreaker: ReturnType<typeof circuitBreakerManager.getBreaker>;

  constructor(public readonly platform: PlatformType) {
    super();
    // Initialize circuit breaker sau khi platform được set
    this.circuitBreaker = circuitBreakerManager.getBreaker(`platform-${this.platform}`, {
      failureThreshold: 5,
      resetTimeoutMs: 60000, // 1 minute
      monitoringWindowMs: 60000, // 1 minute
    });
  }

  /**
   * Get current status
   */
  get status(): ConnectionStatus {
    return this._status;
  }

  /**
   * Set status và emit event
   */
  protected setStatus(status: ConnectionStatus): void {
    if (this._status !== status) {
      this._status = status;
      this.emit('status', status);
      logger.info(`Platform ${this.platform} status changed to ${status}`);
    }
  }

  /**
   * Abstract methods - must be implemented by subclasses
   */
  abstract connect(config: PlatformConnectionConfig): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract sendMessage(chatId: string, message: string, options?: Record<string, unknown>): Promise<void>;
  abstract getChats(): Promise<PlatformChat[]>;
  abstract getMessages(chatId: string, limit?: number): Promise<PlatformMessage[]>;

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this._status === 'connected';
  }

  /**
   * Handle errors
   * WHY: Centralized error handling
   */
  protected handleError(error: Error, context?: string): void {
    const errorMessage = context
      ? `Error in ${this.platform} adapter (${context}): ${error.message}`
      : `Error in ${this.platform} adapter: ${error.message}`;
    
    logger.error(errorMessage, { error, platform: this.platform, context });
    this.emit('error', error);
    this.setStatus('error');
  }

  /**
   * Emit message event
   */
  protected emitMessage(message: PlatformMessage): void {
    this.emit('message', message);
  }

  /**
   * Execute với retry và circuit breaker
   * WHY: Centralized retry logic cho platform operations
   */
  protected async executeWithRetry<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T> {
    return this.circuitBreaker.execute(() =>
      retryWithBackoff(fn, {
        maxRetries: 3,
        initialDelayMs: 1000,
        maxDelayMs: 10000,
        ...options,
      })
    );
  }

  /**
   * Auto-recovery: Try to reconnect nếu disconnected
   * WHY: Automatic recovery từ connection errors
   */
  protected async attemptRecovery(): Promise<boolean> {
    if (this._status === 'disconnected' || this._status === 'error') {
      try {
        logger.info(`Attempting to recover ${this.platform} connection`);
        
        if (this.config) {
          await this.connect(this.config);
          return true;
        }
      } catch (error) {
        logger.error(`Recovery failed for ${this.platform}:`, error);
        return false;
      }
    }
    return false;
  }
}

