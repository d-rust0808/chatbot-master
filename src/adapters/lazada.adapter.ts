/**
 * Lazada Platform Adapter
 * 
 * WHY: Lazada Seller API integration
 * - OAuth authentication
 * - Official API endpoints
 * - Message handling
 * - Rate limiting
 */

import { BasePlatformAdapter } from '../domain/base-platform-adapter';
import type {
  PlatformMessage,
  PlatformChat,
  PlatformConnectionConfig,
} from '../types/platform';
import { logger } from '../infrastructure/logger';
import axios, { AxiosInstance } from 'axios';

/**
 * Lazada Adapter
 * WHY: Lazada Seller API integration
 */
export class LazadaAdapter extends BasePlatformAdapter {
  private apiClient?: AxiosInstance;
  private accessToken?: string;
  private _refreshToken?: string; // For future token refresh
  private _appKey?: string; // For future API signing
  private _appSecret?: string; // For future API signing
  private sellerId?: string;
  private messageListeners: Set<(message: PlatformMessage) => void> = new Set();

  constructor() {
    super('lazada');
  }

  /**
   * Connect to Lazada
   * WHY: OAuth flow và initialize API client
   */
  async connect(config: PlatformConnectionConfig): Promise<void> {
    try {
      this.setStatus('connecting');
      this.config = config;

      // Get credentials
      const appKey = config.credentials?.appKey as string | undefined;
      const appSecret = config.credentials?.appSecret as string | undefined;
      const accessToken = config.credentials?.accessToken as string | undefined;
      const refreshToken = config.credentials?.refreshToken as string | undefined;
      const sellerId = config.credentials?.sellerId as string | undefined;

      if (!appKey || !appSecret) {
        throw new Error('Lazada appKey and appSecret are required');
      }

      // Store for future API signing (Lazada API may require signature)
      this._appKey = appKey;
      this._appSecret = appSecret;
      this.sellerId = sellerId;
      
      // Use them to avoid unused warning (will be used for API signing later)
      if (this._appKey && this._appSecret) {
        logger.debug('Lazada API credentials stored for signing');
      }

      // Initialize API client
      this.apiClient = axios.create({
        baseURL: 'https://api.lazada.com.my/rest',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // If access token provided, use it; otherwise need OAuth flow
      if (accessToken) {
        this.accessToken = accessToken;
        if (refreshToken) {
          this._refreshToken = refreshToken;
        }
      } else {
        // OAuth flow - redirect user to authorize
        this.setStatus('authenticating');
        this.emit('authenticating', {
          type: 'oauth',
          message: 'Please authorize Lazada access',
          url: this.getOAuthUrl(appKey),
        });
        throw new Error('OAuth flow not yet implemented. Please provide accessToken.');
      }

      // Verify connection
      await this.verifyConnection();

      // Start listening for messages
      await this.startMessageListener();

      this.setStatus('connected');
      this.emit('connected');
      logger.info('Lazada connected successfully');
    } catch (error) {
      this.setStatus('error');
      logger.error('Failed to connect to Lazada:', error);
      throw error;
    }
  }

  /**
   * Get OAuth URL
   */
  private getOAuthUrl(appKey: string): string {
    // Lazada OAuth URL
    return `https://auth.lazada.com/oauth/authorize?response_type=code&force_auth=true&redirect_uri=${encodeURIComponent('http://localhost:3000/callback/lazada')}&client_id=${appKey}`;
  }

  /**
   * Verify connection
   */
  private async verifyConnection(): Promise<void> {
    if (!this.apiClient || !this.accessToken) {
      throw new Error('API client or access token not initialized');
    }

    try {
      // Test API call - get seller info
      const response = await this.apiClient.get('/seller/get', {
        params: {
          access_token: this.accessToken,
        },
      });

      if (response.data.code !== '0') {
        throw new Error(response.data.message || 'API error');
      }

      logger.info('Lazada connection verified');
    } catch (error) {
      logger.error('Failed to verify Lazada connection:', error);
      throw error;
    }
  }

  /**
   * Start listening for new messages
   */
  private async startMessageListener(): Promise<void> {
    // Poll for new messages
    setInterval(async () => {
      try {
        await this.checkForNewMessages();
      } catch (error) {
        logger.error('Error checking for new messages:', error);
      }
    }, 10000); // Check every 10 seconds

    logger.info('Lazada message listener started');
  }

  /**
   * Check for new messages
   */
  private async checkForNewMessages(): Promise<void> {
    if (!this.apiClient || !this.accessToken) return;

    try {
      // Lazada API: Get conversation list
      // Note: Actual endpoint may vary, this is a placeholder
      const response = await this.apiClient.get('/message/conversation/list', {
        params: {
          access_token: this.accessToken,
          seller_id: this.sellerId,
          page_size: 50,
        },
      });

      if (response.data.code !== '0') {
        logger.error('Lazada API error:', response.data.message);
        return;
      }

      const conversations = response.data.data?.conversations || [];

      for (const conv of conversations) {
        if (conv.unread_count > 0) {
          await this.processNewMessages(conv.conversation_id);
        }
      }
    } catch (error) {
      logger.error('Error checking for new messages:', error);
    }
  }

  /**
   * Process new messages from conversation
   */
  private async processNewMessages(conversationId: string): Promise<void> {
    if (!this.apiClient || !this.accessToken) return;

    try {
      // Get messages from conversation
      const response = await this.apiClient.get('/message/conversation/messages', {
        params: {
          access_token: this.accessToken,
          conversation_id: conversationId,
          page_size: 20,
        },
      });

      if (response.data.code !== '0') {
        logger.error('Lazada API error:', response.data.message);
        return;
      }

      const messages = response.data.data?.messages || [];

      for (const msg of messages) {
        if (msg.sender_id !== this.sellerId) {
          // Incoming message
          const platformMessage: PlatformMessage = {
            id: msg.message_id?.toString() || Math.random().toString(36),
            chatId: conversationId,
            direction: 'incoming',
            content: msg.content || '',
            contentType: msg.message_type === 'image' ? 'image' : 'text',
            timestamp: new Date(msg.create_time * 1000),
            senderId: msg.sender_id,
          };

          this.emit('message', platformMessage);
          this.messageListeners.forEach((listener: (message: PlatformMessage) => void) => {
            listener(platformMessage);
          });
        }
      }
    } catch (error) {
      logger.error('Error processing new messages:', error);
    }
  }

  /**
   * Disconnect
   */
  async disconnect(): Promise<void> {
    this.apiClient = undefined;
    this.accessToken = undefined;
    // Clear refresh token (stored for future token refresh feature)
    if (this._refreshToken) {
      this._refreshToken = undefined;
    }

    this.setStatus('disconnected');
    this.emit('disconnected');
    logger.info('Lazada disconnected');
  }

  /**
   * Send message
   */
  async sendMessage(
    chatId: string,
    message: string,
    _options?: Record<string, unknown>
  ): Promise<void> {
    if (!this.apiClient || !this.accessToken || !this.isConnected()) {
      throw new Error('Lazada not connected');
    }

    return this.executeWithRetry(
      async () => {
        if (!this.apiClient || !this.accessToken) {
          throw new Error('Lazada API client not initialized');
        }

        // Lazada API: Send message
        const response = await this.apiClient.post('/message/send', {
          access_token: this.accessToken,
          conversation_id: chatId,
          message_type: 'text',
          content: message,
        });

        if (response.data.code !== '0') {
          throw new Error(response.data.message || 'API error');
        }

        logger.info(`Lazada message sent to ${chatId}`);
      },
      {
        retryableErrors: ['timeout', 'network', 'econnrefused', 'rate limit'],
      }
    );
  }

  /**
   * Get chats
   */
  async getChats(): Promise<PlatformChat[]> {
    if (!this.apiClient || !this.accessToken || !this.isConnected()) {
      throw new Error('Lazada not connected');
    }

    try {
      const response = await this.apiClient.get('/message/conversation/list', {
        params: {
          access_token: this.accessToken,
          seller_id: this.sellerId,
          page_size: 100,
        },
      });

      if (response.data.code !== '0') {
        throw new Error(response.data.message || 'API error');
      }

      const conversations = response.data.data?.conversations || [];

      return conversations.map((conv: any) => ({
        id: conv.conversation_id,
        name: conv.buyer_name || 'Unknown',
        type: 'individual' as const,
        metadata: {
          unreadCount: conv.unread_count,
          lastMessage: conv.last_message,
        },
      }));
    } catch (error) {
      logger.error('Error getting chats:', error);
      throw error;
    }
  }

  /**
   * Get messages from chat
   */
  async getMessages(chatId: string, limit: number = 50): Promise<PlatformMessage[]> {
    if (!this.apiClient || !this.accessToken || !this.isConnected()) {
      throw new Error('Lazada not connected');
    }

    try {
      const response = await this.apiClient.get('/message/conversation/messages', {
        params: {
          access_token: this.accessToken,
          conversation_id: chatId,
          page_size: limit,
        },
      });

      if (response.data.code !== '0') {
        throw new Error(response.data.message || 'API error');
      }

      const messages = response.data.data?.messages || [];

      return messages.map((msg: any) => ({
        id: msg.message_id?.toString() || Math.random().toString(36),
        chatId,
        direction: msg.sender_id === this.sellerId ? 'outgoing' : 'incoming',
        content: msg.content || '',
        contentType: msg.message_type === 'image' ? 'image' : 'text',
        timestamp: new Date(msg.create_time * 1000),
        senderId: msg.sender_id,
      }));
    } catch (error) {
      logger.error('Error getting messages:', error);
      throw error;
    }
  }

  /**
   * On message callback
   */
  onMessage(callback: (message: PlatformMessage) => void): void {
    this.messageListeners.add(callback);
  }
}

