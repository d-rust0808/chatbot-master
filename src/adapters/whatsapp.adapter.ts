/**
 * WhatsApp Platform Adapter
 * 
 * WHY: WhatsApp integration sử dụng whatsapp-web.js
 * - QR code authentication
 * - Session persistence
 * - Message handling
 */

import { Client, LocalAuth, Message, Chat, MessageMedia } from 'whatsapp-web.js';
import { BasePlatformAdapter } from '../domain/base-platform-adapter';
import type {
  PlatformMessage,
  PlatformChat,
  PlatformConnectionConfig,
} from '../types/platform';
import { logger } from '../infrastructure/logger';
import { prisma } from '../infrastructure/database';

/**
 * WhatsApp Adapter
 * WHY: Wrap whatsapp-web.js trong adapter pattern
 */
export class WhatsAppAdapter extends BasePlatformAdapter {
  private client?: Client;
  private connectionId?: string;

  constructor() {
    super('whatsapp');
  }

  /**
   * Connect to WhatsApp
   * WHY: Initialize whatsapp-web.js client với session persistence
   */
  async connect(config: PlatformConnectionConfig): Promise<void> {
    try {
      this.setStatus('connecting');
      this.config = config;
      this.connectionId = config.credentials?.connectionId as string | undefined;

      // Session data được handle tự động bởi LocalAuth
      // Không cần load manually

      // Initialize WhatsApp client
      // WHY: LocalAuth để lưu session locally
      this.client = new Client({
        authStrategy: new LocalAuth({
          clientId: this.connectionId || 'default',
        }),
        puppeteer: {
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
          ],
        },
      });

      // Setup event handlers
      this.setupEventHandlers();

      // Initialize client
      await this.client.initialize();

      logger.info('WhatsApp client initialized');
    } catch (error) {
      this.handleError(error as Error, 'connect');
      throw error;
    }
  }

  /**
   * Setup event handlers
   * WHY: Handle WhatsApp events (QR, ready, messages, etc.)
   */
  private setupEventHandlers(): void {
    if (!this.client) return;

    // QR code event (cần scan để authenticate)
    this.client.on('qr', async (_qr: string) => {
      logger.info('WhatsApp QR code generated');
      // TODO: Emit QR code để frontend hiển thị
      // this.emit('qr', qr);
    });

    // Ready event (authenticated và ready)
    this.client.on('ready', async () => {
      logger.info('WhatsApp client ready');
      this.setStatus('connected');
      this.emit('authenticated');

      // Save session data
      await this.saveSession();
    });

    // Authentication failure
    this.client.on('auth_failure', (msg) => {
      logger.error('WhatsApp authentication failed:', msg);
      this.handleError(new Error(`Authentication failed: ${msg}`), 'auth_failure');
    });

    // Disconnected
    this.client.on('disconnected', async (reason) => {
      logger.warn('WhatsApp disconnected:', reason);
      this.setStatus('disconnected');
      this.emit('disconnected');

      // Auto-recovery attempt
      if (this.config) {
        logger.info('Attempting auto-recovery for WhatsApp');
        setTimeout(async () => {
          try {
            await this.attemptRecovery();
          } catch (error) {
            logger.error('Auto-recovery failed:', error);
          }
        }, 5000); // Wait 5 seconds before retry
      }
    });

    // Message received
    this.client.on('message', async (message: Message) => {
      try {
        const platformMessage = await this.convertMessage(message);
        this.emitMessage(platformMessage);
      } catch (error) {
        this.handleError(error as Error, 'message_received');
      }
    });
  }

  /**
   * Convert WhatsApp message to PlatformMessage
   */
  private async convertMessage(message: Message): Promise<PlatformMessage> {
    const contact = await message.getContact();
    const chat = await message.getChat();

    const platformMessage: PlatformMessage = {
      id: message.id._serialized,
      chatId: chat.id._serialized,
      direction: 'incoming',
      content: message.body || '',
      contentType: this.getContentType(message),
      timestamp: new Date(message.timestamp * 1000),
      senderId: contact.id._serialized,
      senderName: contact.pushname || contact.name || undefined,
      metadata: {
        from: message.from,
        to: message.to,
        hasMedia: message.hasMedia,
        isGroupMsg: chat.isGroup,
      },
    };

    // Handle media messages
    if (message.hasMedia) {
      try {
        const media = await message.downloadMedia();
        if (media) {
          // Convert base64 to data URL hoặc save to file
          platformMessage.mediaUrl = `data:${media.mimetype};base64,${media.data}`;
          platformMessage.metadata = {
            ...platformMessage.metadata,
            mediaMimetype: media.mimetype,
            mediaFilename: media.filename,
          };
        }
      } catch (error) {
        logger.error('Failed to download media:', error);
        // Continue without media URL
      }
    }

    return platformMessage;
  }

  /**
   * Get content type từ WhatsApp message
   */
  private getContentType(message: Message): PlatformMessage['contentType'] {
    if (message.hasMedia) {
      const mediaType = message.type;
      if (mediaType === 'image') return 'image';
      if (mediaType === 'video') return 'video';
      if (mediaType === 'audio') return 'audio';
      if (mediaType === 'document') return 'document';
    }
    return 'text';
  }

  /**
   * Save session data
   * WHY: Persist session để reuse sau khi restart
   */
  private async saveSession(): Promise<void> {
    if (!this.connectionId) return;

    try {
      // Session data được lưu tự động bởi LocalAuth
      // Chỉ cần update lastSyncAt
      await prisma.platformConnection.update({
        where: { id: this.connectionId },
        data: {
          status: 'connected',
          lastSyncAt: new Date(),
        },
      });
    } catch (error) {
      logger.error('Failed to save WhatsApp session:', error);
    }
  }

  /**
   * Disconnect
   */
  async disconnect(): Promise<void> {
    try {
      if (this.client) {
        await this.client.destroy();
        this.client = undefined;
      }
      this.setStatus('disconnected');
      logger.info('WhatsApp disconnected');
    } catch (error) {
      this.handleError(error as Error, 'disconnect');
      throw error;
    }
  }

  /**
   * Send message với retry logic và media support
   */
  async sendMessage(
    chatId: string,
    message: string,
    options?: Record<string, unknown>
  ): Promise<void> {
    if (!this.client || !this.isConnected()) {
      // Try auto-recovery
      const recovered = await this.attemptRecovery();
      if (!recovered) {
      throw new Error('WhatsApp client not connected');
      }
    }

    return this.executeWithRetry(
      async () => {
        if (!this.client) {
          throw new Error('WhatsApp client not initialized');
        }

        // Check if sending media
        if (options?.mediaUrl || options?.mediaPath) {
          await this.sendMedia(chatId, message, options);
        } else {
          await this.client.sendMessage(chatId, message);
        }

        logger.info(`WhatsApp message sent to ${chatId}`);
      },
      {
        retryableErrors: ['timeout', 'network', 'econnrefused', 'rate limit'],
      }
    );
  }

  /**
   * Send media message (image, video, document, audio)
   * WHY: Support media messages với whatsapp-web.js API
   */
  private async sendMedia(
    chatId: string,
    caption: string,
    options: Record<string, unknown>
  ): Promise<void> {
    if (!this.client) {
      throw new Error('WhatsApp client not initialized');
    }

    const mediaUrl = options.mediaUrl as string | undefined;
    const mediaPath = options.mediaPath as string | undefined;
    const mediaType = (options.mediaType as string) || 'image';

    if (!mediaUrl && !mediaPath) {
      throw new Error('mediaUrl or mediaPath is required for media messages');
    }

    try {
      // Create MessageMedia object
      // WHY: whatsapp-web.js requires MessageMedia object cho media messages
      let media: MessageMedia;

      if (mediaPath) {
        // Local file path
        media = MessageMedia.fromFilePath(mediaPath);
      } else if (mediaUrl) {
        // URL - download first
        const axios = (await import('axios')).default;
        const response = await axios.get(mediaUrl, {
          responseType: 'arraybuffer',
        });
        
        // Determine mimetype from URL or response headers
        const mimetype = response.headers['content-type'] || 'image/jpeg';
        const base64 = Buffer.from(response.data).toString('base64');
        
        media = new MessageMedia(mimetype, base64);
      } else {
        throw new Error('Invalid media source');
      }

      // Send media message based on type
      switch (mediaType) {
        case 'image':
          await this.client.sendMessage(chatId, media, { caption });
          break;
        case 'video':
          await this.client.sendMessage(chatId, media, {
            caption,
            sendVideoAsGif: options.sendAsGif as boolean | undefined,
          });
          break;
        case 'document':
          await this.client.sendMessage(chatId, media, {
            caption,
            sendMediaAsDocument: true,
          });
          break;
        case 'audio':
          await this.client.sendMessage(chatId, media, {
            sendAudioAsVoice: options.sendAsVoice as boolean | undefined,
          });
          break;
        default:
          throw new Error(`Unsupported media type: ${mediaType}`);
      }

      logger.info(`Media message sent (${mediaType}) to ${chatId}`);
    } catch (error) {
      logger.error('Failed to send media:', error);
      throw error;
    }
  }

  /**
   * Get chats
   */
  async getChats(): Promise<PlatformChat[]> {
    if (!this.client || !this.isConnected()) {
      throw new Error('WhatsApp client not connected');
    }

    try {
      const chats = await this.client.getChats();
      return chats.map((chat: Chat) => ({
        id: chat.id._serialized,
        name: chat.name,
        type: chat.isGroup ? 'group' : 'individual',
        metadata: {
          isGroup: chat.isGroup,
          isReadOnly: chat.isReadOnly,
        },
      }));
    } catch (error) {
      this.handleError(error as Error, 'getChats');
      throw error;
    }
  }

  /**
   * Get messages
   */
  async getMessages(chatId: string, limit: number = 50): Promise<PlatformMessage[]> {
    if (!this.client || !this.isConnected()) {
      throw new Error('WhatsApp client not connected');
    }

    try {
      const chat = await this.client.getChatById(chatId);
      const messages = await chat.fetchMessages({ limit });
      
      const platformMessages: PlatformMessage[] = [];
      for (const message of messages) {
        const platformMessage = await this.convertMessage(message);
        platformMessages.push(platformMessage);
      }

      return platformMessages;
    } catch (error) {
      this.handleError(error as Error, 'getMessages');
      throw error;
    }
  }
}

