/**
 * Platform types và interfaces
 * 
 * WHY: Type-safe platform integration
 * - Unified interface cho tất cả platforms
 * - Event-driven architecture
 * - Type-safe message handling
 */

// Platform types
export type PlatformType = 'whatsapp' | 'facebook' | 'instagram' | 'tiktok' | 'zalo' | 'shopee';

// Connection status
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error' | 'authenticating';

// Message direction
export type MessageDirection = 'incoming' | 'outgoing';

// Message content type
export type MessageContentType = 'text' | 'image' | 'video' | 'audio' | 'document' | 'location' | 'contact';

// Platform message structure
export interface PlatformMessage {
  id: string; // Platform-specific message ID
  chatId: string; // Platform-specific chat ID
  direction: MessageDirection;
  content: string;
  contentType: MessageContentType;
  timestamp: Date;
  senderId?: string;
  senderName?: string;
  metadata?: Record<string, unknown>; // Platform-specific data
  mediaUrl?: string; // For media messages
}

// Chat information
export interface PlatformChat {
  id: string; // Platform-specific chat ID
  name?: string;
  type: 'individual' | 'group';
  participants?: string[];
  metadata?: Record<string, unknown>;
}

// Connection configuration
export interface PlatformConnectionConfig {
  platform: PlatformType;
  credentials?: Record<string, unknown>; // Platform-specific credentials
  proxy?: {
    host: string;
    port: number;
    username?: string;
    password?: string;
  };
  options?: Record<string, unknown>; // Platform-specific options
}

// Session data (for persistence)
export interface PlatformSession {
  platform: PlatformType;
  connectionId: string;
  sessionData: Record<string, unknown>; // Cookies, localStorage, etc.
  lastSyncAt: Date;
}

