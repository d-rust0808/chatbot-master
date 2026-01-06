/**
 * Shopee Platform Adapter
 * 
 * WHY: Shopee Seller API integration
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
 * Shopee Adapter
 * WHY: Shopee Seller API integration
 */
export class ShopeeAdapter extends BasePlatformAdapter {
  private apiClient?: AxiosInstance;
  private accessToken?: string;
  private _refreshToken?: string; // For future token refresh
  private partnerId?: string;
  private shopId?: string;
  private messageListeners: Set<(message: PlatformMessage) => void> = new Set();

  constructor() {
    super('shopee');
  }

  /**
   * Connect to Shopee
   * WHY: OAuth flow và initialize API client
   */
  async connect(config: PlatformConnectionConfig): Promise<void> {
    try {
      this.setStatus('connecting');
      this.config = config;

      // Get credentials
      const partnerId = config.credentials?.partnerId as string | undefined;
      const partnerKey = config.credentials?.partnerKey as string | undefined;
      const accessToken = config.credentials?.accessToken as string | undefined;
      const shopId = config.credentials?.shopId as string | undefined;

      if (!partnerId || !partnerKey) {
        throw new Error('Shopee partnerId and partnerKey are required');
      }

      this.partnerId = partnerId;
      this.shopId = shopId;

      // Initialize API client
      this.apiClient = axios.create({
        baseURL: 'https://partner.shopeemobile.com/api/v2',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // If access token provided, use it; otherwise need OAuth flow
      if (accessToken) {
        this.accessToken = accessToken;
        const refreshTokenValue = config.credentials?.refreshToken as string | undefined;
        if (refreshTokenValue) {
          this._refreshToken = refreshTokenValue;
        }
      } else {
        // OAuth flow - redirect user to authorize
        this.setStatus('authenticating');
        this.emit('authenticating', {
          type: 'oauth',
          message: 'Please authorize Shopee access',
          url: this.getOAuthUrl(partnerId),
        });
        throw new Error('OAuth flow not yet implemented. Please provide accessToken.');
      }

      // Verify connection
      await this.verifyConnection();

      // Start listening for messages
      await this.startMessageListener();

      this.setStatus('connected');
      this.emit('connected');
      logger.info('Shopee connected successfully');
    } catch (error) {
      this.setStatus('error');
      logger.error('Failed to connect to Shopee:', error);
      throw error;
    }
  }

  /**
   * Get OAuth URL
   */
  private getOAuthUrl(partnerId: string): string {
    // Shopee OAuth URL
    return `https://partner.shopeemobile.com/api/v2/shop/auth_partner?partner_id=${partnerId}&redirect=${encodeURIComponent('http://localhost:3000/callback/shopee')}`;
  }

  /**
   * Verify connection
   */
  private async verifyConnection(): Promise<void> {
    if (!this.apiClient || !this.accessToken) {
      throw new Error('API client or access token not initialized');
    }

    try {
      // Test API call - get shop info
      const response = await this.apiClient.get('/shop/get_shop_info', {
        params: {
          partner_id: this.partnerId,
          shop_id: this.shopId,
          access_token: this.accessToken,
          timestamp: Math.floor(Date.now() / 1000),
        },
      });

      if (response.data.error) {
        throw new Error(response.data.error);
      }

      logger.info('Shopee connection verified');
    } catch (error) {
      logger.error('Failed to verify Shopee connection:', error);
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

    logger.info('Shopee message listener started');
  }

  /**
   * Check for new messages
   */
  private async checkForNewMessages(): Promise<void> {
    if (!this.apiClient || !this.accessToken) return;

    try {
      // Shopee API: Get conversation list
      const response = await this.apiClient.get('/chat/get_conversation_list', {
        params: {
          partner_id: this.partnerId,
          shop_id: this.shopId,
          access_token: this.accessToken,
          timestamp: Math.floor(Date.now() / 1000),
          page_size: 50,
        },
      });

      if (response.data.error) {
        logger.error('Shopee API error:', response.data.error);
        return;
      }

      const conversations = response.data.response?.conversation_list || [];

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
      const response = await this.apiClient.get('/chat/get_message', {
        params: {
          partner_id: this.partnerId,
          shop_id: this.shopId,
          access_token: this.accessToken,
          timestamp: Math.floor(Date.now() / 1000),
          conversation_id: conversationId,
          page_size: 20,
        },
      });

      if (response.data.error) {
        logger.error('Shopee API error:', response.data.error);
        return;
      }

      const messages = response.data.response?.message_list || [];

      for (const msg of messages) {
        if (msg.from_id !== this.shopId) {
          // Incoming message
          const platformMessage: PlatformMessage = {
            id: msg.message_id?.toString() || Math.random().toString(36),
            chatId: conversationId,
            direction: 'incoming',
            content: msg.content || '',
            contentType: msg.message_type === 'image' ? 'image' : 'text',
            timestamp: new Date(msg.create_time * 1000),
            senderId: msg.from_id,
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
    logger.info('Shopee disconnected');
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
      throw new Error('Shopee not connected');
    }

    return this.executeWithRetry(
      async () => {
        if (!this.apiClient || !this.accessToken) {
          throw new Error('Shopee API client not initialized');
        }

        // Shopee API: Send message
        const response = await this.apiClient.post('/chat/send_message', {
          partner_id: this.partnerId,
          shop_id: this.shopId,
          access_token: this.accessToken,
          timestamp: Math.floor(Date.now() / 1000),
          conversation_id: chatId,
          message_type: 'text',
          content: message,
        });

        if (response.data.error) {
          throw new Error(response.data.error);
        }

        logger.info(`Shopee message sent to ${chatId}`);
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
      throw new Error('Shopee not connected');
    }

    try {
      const response = await this.apiClient.get('/chat/get_conversation_list', {
        params: {
          partner_id: this.partnerId,
          shop_id: this.shopId,
          access_token: this.accessToken,
          timestamp: Math.floor(Date.now() / 1000),
          page_size: 100,
        },
      });

      if (response.data.error) {
        throw new Error(response.data.error);
      }

      const conversations = response.data.response?.conversation_list || [];

      return conversations.map((conv: any) => ({
        id: conv.conversation_id,
        name: conv.buyer_username || 'Unknown',
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
      throw new Error('Shopee not connected');
    }

    try {
      const response = await this.apiClient.get('/chat/get_message', {
        params: {
          partner_id: this.partnerId,
          shop_id: this.shopId,
          access_token: this.accessToken,
          timestamp: Math.floor(Date.now() / 1000),
          conversation_id: chatId,
          page_size: limit,
        },
      });

      if (response.data.error) {
        throw new Error(response.data.error);
      }

      const messages = response.data.response?.message_list || [];

      return messages.map((msg: any) => ({
        id: msg.message_id?.toString() || Math.random().toString(36),
        chatId,
        direction: msg.from_id === this.shopId ? 'outgoing' : 'incoming',
        content: msg.content || '',
        contentType: msg.message_type === 'image' ? 'image' : 'text',
        timestamp: new Date(msg.create_time * 1000),
        senderId: msg.from_id,
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

