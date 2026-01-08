/**
 * Platform Manager Service
 * 
 * WHY: Quản lý multiple platform adapters
 * - Registry pattern
 * - Lifecycle management
 * - Event aggregation
 * - Error handling
 */

import { logger } from '../../infrastructure/logger';
import { IPlatformAdapter } from '../../domain/platform-adapter.interface';
import { WhatsAppAdapter } from '../../adapters/whatsapp.adapter';
import { FacebookAdapter } from '../../adapters/facebook.adapter';
import { InstagramAdapter } from '../../adapters/instagram.adapter';
import { TikTokAdapter } from '../../adapters/tiktok.adapter';
import { ZaloAdapter } from '../../adapters/zalo.adapter';
import { ShopeeAdapter } from '../../adapters/shopee.adapter';
import type { PlatformType, PlatformConnectionConfig, PlatformMessage } from '../../types/platform';
import { prisma } from '../../infrastructure/database';
import { aiService } from '../ai/ai.service';
import { webSocketServer } from '../../infrastructure/websocket';

/**
 * Platform Manager
 * WHY: Centralized management cho tất cả platform connections
 */
export class PlatformManagerService {
  private adapters: Map<string, IPlatformAdapter> = new Map();

  /**
   * Create adapter instance
   * WHY: Factory pattern để tạo adapter dựa trên platform type
   */
  private createAdapter(platform: PlatformType): IPlatformAdapter {
    switch (platform) {
      case 'whatsapp':
        return new WhatsAppAdapter();
      case 'facebook':
        return new FacebookAdapter();
      case 'instagram':
        return new InstagramAdapter();
      case 'tiktok':
        return new TikTokAdapter();
      case 'zalo':
        return new ZaloAdapter();
      case 'shopee':
        return new ShopeeAdapter();
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }

  /**
   * Connect platform
   * WHY: Initialize và connect adapter
   */
  async connectPlatform(
    connectionId: string,
    config: PlatformConnectionConfig
  ): Promise<void> {
    try {
      // Check if already connected
      if (this.adapters.has(connectionId)) {
        logger.warn(`Platform ${config.platform} already connected: ${connectionId}`);
        return;
      }

      // Create adapter
      const adapter = this.createAdapter(config.platform);

      // Setup event handlers
      this.setupAdapterEvents(adapter, connectionId);

      // Connect
      await adapter.connect({ ...config, credentials: { ...config.credentials, connectionId } });

      // Store adapter
      this.adapters.set(connectionId, adapter);

      // Update database
      await prisma.platformConnection.update({
        where: { id: connectionId },
        data: {
          status: 'connected',
          lastSyncAt: new Date(),
        },
      });

      logger.info(`Platform ${config.platform} connected: ${connectionId}`);
    } catch (error) {
      logger.error(`Failed to connect platform ${config.platform}:`, error);
      
      // Update database với error status
      await prisma.platformConnection.update({
        where: { id: connectionId },
        data: {
          status: 'error',
        },
      });

      throw error;
    }
  }

  /**
   * Setup event handlers cho adapter
   * WHY: Aggregate events từ tất cả adapters
   */
  private setupAdapterEvents(adapter: IPlatformAdapter, connectionId: string): void {
    // Message event
    adapter.on('message', async (message: PlatformMessage) => {
      logger.info(`Message received on ${adapter.platform}:`, {
        connectionId,
        chatId: message.chatId,
      });

      try {
        // 1. Get or create conversation
        const conversation = await this.getOrCreateConversation(
          connectionId,
          message.chatId,
          adapter.platform
        );

        // 2. Save incoming message to database
        const savedMessage = await prisma.message.create({
          data: {
            conversationId: conversation.id,
            platform: adapter.platform,
            messageId: message.id,
            direction: 'incoming',
            content: message.content,
            contentType: message.contentType,
            metadata: message.metadata as any,
          },
        });

        // Emit WebSocket event for new message
        webSocketServer.emitMessageUpdate(
          conversation.tenantId,
          conversation.id,
          savedMessage
        );

        // 3. Generate AI response
        const aiResponse = await aiService.generateResponse(
          conversation.id,
          message.content,
          conversation.chatbotId
        );

        // 4. Send response back to platform
        await adapter.sendMessage(message.chatId, aiResponse);

        // Save outgoing message
        const outgoingMessage = await prisma.message.create({
          data: {
            conversationId: conversation.id,
            platform: adapter.platform,
            messageId: `outgoing-${Date.now()}`,
            direction: 'outgoing',
            content: aiResponse,
            contentType: 'text',
          },
        });

        // Emit WebSocket event for outgoing message
        webSocketServer.emitMessageUpdate(
          conversation.tenantId,
          conversation.id,
          outgoingMessage
        );

        logger.info(`AI response sent to ${message.chatId}`);
      } catch (error) {
        logger.error('Failed to process message:', {
          error: error instanceof Error ? error.message : error,
          connectionId,
          chatId: message.chatId,
        });
      }
    });

    // Status event
    adapter.on('status', async (status) => {
      logger.info(`Platform ${adapter.platform} status changed: ${status}`, {
        connectionId,
      });

      // Update database
      try {
        // Get connection với chatbot để lấy tenantId
        const connection = await prisma.platformConnection.findUnique({
          where: { id: connectionId },
          include: {
            chatbot: {
              select: { tenantId: true },
            },
          },
        });

        if (connection) {
          await prisma.platformConnection.update({
            where: { id: connectionId },
            data: { status },
          });

          // Emit WebSocket event for platform status
          webSocketServer.emitPlatformStatusUpdate(
            connection.chatbot.tenantId,
            connectionId,
            status
          );
        }
      } catch (error) {
        logger.error('Failed to update platform status:', error);
      }
    });

    // Error event
    adapter.on('error', (error) => {
      logger.error(`Platform ${adapter.platform} error:`, {
        connectionId,
        error: error.message,
      });
    });
  }

  /**
   * Disconnect platform
   */
  async disconnectPlatform(connectionId: string): Promise<void> {
    const adapter = this.adapters.get(connectionId);
    if (!adapter) {
      logger.warn(`Adapter not found: ${connectionId}`);
      return;
    }

    try {
      await adapter.disconnect();
      this.adapters.delete(connectionId);

      // Update database
      await prisma.platformConnection.update({
        where: { id: connectionId },
        data: {
          status: 'disconnected',
        },
      });

      logger.info(`Platform disconnected: ${connectionId}`);
    } catch (error) {
      logger.error(`Failed to disconnect platform:`, error);
      throw error;
    }
  }

  /**
   * Get adapter
   */
  getAdapter(connectionId: string): IPlatformAdapter | undefined {
    return this.adapters.get(connectionId);
  }

  /**
   * Get all active connections
   */
  getActiveConnections(): string[] {
    return Array.from(this.adapters.keys());
  }

  /**
   * Send message (direct - synchronous)
   */
  async sendMessage(
    connectionId: string,
    chatId: string,
    message: string,
    options?: Record<string, unknown>
  ): Promise<void> {
    const adapter = this.adapters.get(connectionId);
    if (!adapter) {
      throw new Error(`Adapter not found: ${connectionId}`);
    }

    if (!adapter.isConnected()) {
      throw new Error(`Adapter not connected: ${connectionId}`);
    }

    await adapter.sendMessage(chatId, message, options);
  }

  /**
   * Get connection info
   */
  async getConnection(connectionId: string) {
    const adapter = this.adapters.get(connectionId);
    if (!adapter) {
      return null;
    }

    // Get from database
    const connection = await prisma.platformConnection.findUnique({
      where: { id: connectionId },
    });

    return connection;
  }

  /**
   * Get chats
   */
  async getChats(connectionId: string) {
    const adapter = this.adapters.get(connectionId);
    if (!adapter) {
      throw new Error(`Adapter not found: ${connectionId}`);
    }

    if (!adapter.isConnected()) {
      throw new Error(`Adapter not connected: ${connectionId}`);
    }

    return adapter.getChats();
  }

  /**
   * Get or create conversation
   * WHY: Auto-create conversation khi có message mới
   */
  private async getOrCreateConversation(
    connectionId: string,
    chatId: string,
    platform: PlatformType
  ) {
    // Get connection để lấy chatbotId và tenantId
    const connection = await prisma.platformConnection.findUnique({
      where: { id: connectionId },
      include: {
        chatbot: {
          select: {
            id: true,
            tenantId: true,
          },
        },
      },
    });

    if (!connection) {
      throw new Error(`Connection ${connectionId} not found`);
    }

    // Try to find existing conversation
    let conversation = await prisma.conversation.findUnique({
      where: {
        platform_chatId: {
          platform,
          chatId,
        },
      },
    });

    // Create if not exists
    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          tenantId: connection.chatbot.tenantId,
          chatbotId: connection.chatbotId,
          platform,
          chatId,
          status: 'active',
        },
      });
    }

    return conversation;
  }
}

// Export singleton instance
export const platformManager = new PlatformManagerService();

