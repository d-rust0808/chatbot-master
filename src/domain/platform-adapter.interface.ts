/**
 * Platform Adapter Interface
 * 
 * WHY: Unified interface cho tất cả platforms
 * - Adapter Pattern: Mỗi platform implement cùng interface
 * - Dễ thêm platform mới
 * - Type-safe và consistent
 */

import { EventEmitter } from 'events';
import type {
  PlatformType,
  ConnectionStatus,
  PlatformMessage,
  PlatformChat,
  PlatformConnectionConfig,
} from '../types/platform';

/**
 * Base interface cho Platform Adapter
 * WHY: Event-driven architecture cho real-time updates
 */
export interface IPlatformAdapter extends EventEmitter {
  /**
   * Platform type identifier
   */
  readonly platform: PlatformType;

  /**
   * Current connection status
   */
  readonly status: ConnectionStatus;

  /**
   * Connect to platform
   * WHY: Async operation, có thể cần authentication
   */
  connect(config: PlatformConnectionConfig): Promise<void>;

  /**
   * Disconnect from platform
   */
  disconnect(): Promise<void>;

  /**
   * Send message
   * WHY: Core functionality của chatbot
   */
  sendMessage(chatId: string, message: string, options?: Record<string, unknown>): Promise<void>;

  /**
   * Get list of chats
   * WHY: Dashboard cần hiển thị conversations
   */
  getChats(): Promise<PlatformChat[]>;

  /**
   * Get messages from a chat
   */
  getMessages(chatId: string, limit?: number): Promise<PlatformMessage[]>;

  /**
   * Check if connected
   */
  isConnected(): boolean;

  /**
   * Events emitted by adapter:
   * - 'message': New message received
   * - 'status': Connection status changed
   * - 'error': Error occurred
   */
}

/**
 * Event types emitted by adapters
 */
export interface PlatformAdapterEvents {
  message: (message: PlatformMessage) => void;
  status: (status: ConnectionStatus) => void;
  error: (error: Error) => void;
  authenticated: () => void;
  disconnected: () => void;
}

