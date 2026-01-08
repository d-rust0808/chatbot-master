/**
 * Zalo Platform Adapter
 * 
 * WHY: Zalo messaging integration sử dụng Puppeteer
 * - Login với QR code hoặc credentials
 * - Navigate to Zalo chat
 * - Listen for new messages
 * - Send messages
 * - Session persistence
 */

import { BasePlatformAdapter } from '../domain/base-platform-adapter';
import type {
  PlatformMessage,
  PlatformChat,
  PlatformConnectionConfig,
} from '../types/platform';
import { logger } from '../infrastructure/logger';
import { browserManager } from '../infrastructure/browser-manager';
import { randomDelay } from '../utils/ai/human-behavior';
import { Page, Browser } from 'puppeteer';

/**
 * Zalo Adapter
 * WHY: Zalo messaging automation với Puppeteer
 */
export class ZaloAdapter extends BasePlatformAdapter {
  private browser?: Browser;
  private page?: Page;
  private messageListeners: Set<(message: PlatformMessage) => void> = new Set();

  constructor() {
    super('zalo');
  }

  /**
   * Connect to Zalo
   * WHY: Login và navigate to chat
   */
  async connect(config: PlatformConnectionConfig): Promise<void> {
    try {
      this.setStatus('connecting');
      this.config = config;

      // Get browser instance
      const connectionId = config.credentials?.connectionId as string | undefined;
      this.browser = await browserManager.createBrowser(
        connectionId || `zalo-${Date.now()}`,
        {
          headless: false, // Zalo thường cần QR code, nên không headless
          userDataDir: connectionId ? `./sessions/zalo-${connectionId}` : undefined,
        }
      );

      // Create new page
      this.page = await this.browser.newPage();
      await this.page.setViewport({ width: 1920, height: 1080 });

      // Navigate to Zalo web
      await this.page.goto('https://chat.zalo.me/', {
        waitUntil: 'networkidle2',
      });

      await randomDelay(2000, 3000);

      // Check if QR code is required
      const needsQR = await this.checkNeedsQR();
      
      if (needsQR) {
        logger.info('Zalo requires QR code login');
        this.setStatus('authenticating');
        this.emit('authenticating', {
          type: 'qr',
          message: 'Please scan QR code in browser',
        });
        
        // Wait for QR code scan
        await this.waitForQRScan();
      } else {
        // Try credentials login if provided
        const phone = config.credentials?.phone as string | undefined;
        const password = config.credentials?.password as string | undefined;

        if (phone && password) {
          await this.loginWithCredentials(phone, password);
        }
      }

      // Verify we're logged in
      const isLoggedIn = await this.checkLoggedIn();
      if (!isLoggedIn) {
        throw new Error('Failed to login to Zalo');
      }

      // Start listening for messages
      await this.startMessageListener();

      this.setStatus('connected');
      this.emit('connected');
      logger.info('Zalo connected successfully');
    } catch (error) {
      this.setStatus('error');
      logger.error('Failed to connect to Zalo:', error);
      throw error;
    }
  }

  /**
   * Check if QR code is needed
   */
  private async checkNeedsQR(): Promise<boolean> {
    if (!this.page) return true;

    try {
      return await this.page.evaluate(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const doc = (globalThis as any).document;
        return doc?.querySelector('[class*="qr"], [id*="qr"]') !== null ||
               doc?.querySelector('img[src*="qr"]') !== null;
      });
    } catch {
      return true;
    }
  }

  /**
   * Wait for QR code scan
   */
  private async waitForQRScan(): Promise<void> {
    if (!this.page) return;

    // Wait for URL to change or QR code to disappear
    await this.page.waitForFunction(
      () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const doc = (globalThis as any).document;
        const win = (globalThis as any).window;
        // Check if QR code is gone or we're on chat page
        return doc?.querySelector('[class*="qr"]') === null ||
               win?.location.href.includes('/chat') ||
               win?.location.href.includes('/home');
      },
      { timeout: 300000 } // 5 minutes
    );

    await randomDelay(2000, 3000);
  }

  /**
   * Login with credentials
   */
  private async loginWithCredentials(phone: string, password: string): Promise<void> {
    if (!this.page) return;

    try {
      // Find phone input
      await this.page.waitForSelector('input[type="tel"], input[placeholder*="phone"], input[placeholder*="số điện thoại"]', {
        timeout: 5000,
      });
      await this.page.type('input[type="tel"], input[placeholder*="phone"]', phone, { delay: 100 });
      await randomDelay(500, 1000);

      // Find password input
      await this.page.type('input[type="password"]', password, { delay: 100 });
      await randomDelay(500, 1000);

      // Click login button
      await this.page.click('button[type="submit"], button:has-text("Đăng nhập")');
      await randomDelay(3000, 5000);
    } catch (error) {
      logger.error('Error logging in with credentials:', error);
      throw error;
    }
  }

  /**
   * Check if logged in
   */
  private async checkLoggedIn(): Promise<boolean> {
    if (!this.page) return false;

    try {
      const chatLoaded = await this.page.evaluate(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const doc = (globalThis as any).document;
        return doc?.querySelector('[class*="chat"], [class*="conversation"]') !== null ||
               doc?.querySelector('a[href*="/chat"]') !== null;
      });

      return chatLoaded;
    } catch {
      return false;
    }
  }

  /**
   * Start listening for new messages
   */
  private async startMessageListener(): Promise<void> {
    if (!this.page) return;

    // Poll for new messages
    setInterval(async () => {
      try {
        await this.checkForNewMessages();
      } catch (error) {
        logger.error('Error checking for new messages:', error);
      }
    }, 5000); // Check every 5 seconds

    logger.info('Zalo message listener started');
  }

  /**
   * Check for new messages
   */
  private async checkForNewMessages(): Promise<void> {
    if (!this.page) return;

    try {
      const unreadMessages = await this.page.evaluate(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const doc = (globalThis as any).document;
        // Look for unread indicators
        const unreadElements = doc?.querySelectorAll('[class*="unread"], [class*="badge"]') || [];
        
        return Array.from(unreadElements).map((el: any) => {
          const chatElement = el.closest('a[href*="/chat"], [class*="conversation"]');
          if (!chatElement) return null;

          const href = chatElement.getAttribute('href') || '';
          const chatId = href.match(/\/chat\/([^\/]+)/)?.[1] || 
                        chatElement.getAttribute('data-id') ||
                        Math.random().toString(36);
          
          return { chatId };
        }).filter(Boolean);
      });

      for (const msg of unreadMessages) {
        if (msg) {
          await this.processNewMessage(msg.chatId);
        }
      }
    } catch (error) {
      logger.error('Error checking for new messages:', error);
    }
  }

  /**
   * Process new message
   */
  private async processNewMessage(chatId: string): Promise<void> {
    if (!this.page) return;

    try {
      // Navigate to chat if not already there
      await this.page.goto(`https://chat.zalo.me/chat/${chatId}`, {
        waitUntil: 'networkidle2',
      });
      await randomDelay(2000, 3000);

      // Get latest message
      const message = await this.page.evaluate(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const doc = (globalThis as any).document;
        const messages = doc?.querySelectorAll('[class*="message"], [class*="msg"]') || [];
        const lastMessage = messages[messages.length - 1];
        
        if (!lastMessage) return null;

        const content = lastMessage.textContent || '';
        const messageId = lastMessage.getAttribute('data-id') || 
                         Math.random().toString(36);

        return {
          id: messageId,
          content,
        };
      });

      if (message) {
        const platformMessage: PlatformMessage = {
          id: message.id,
          chatId,
          direction: 'incoming',
          content: message.content,
          contentType: 'text',
          timestamp: new Date(),
        };

        this.emit('message', platformMessage);
        this.messageListeners.forEach((listener) => listener(platformMessage));
      }
    } catch (error) {
      logger.error('Error processing new message:', error);
    }
  }

  /**
   * Disconnect
   */
  async disconnect(): Promise<void> {
    try {
      if (this.page) {
        await this.page.close();
        this.page = undefined;
      }

      this.setStatus('disconnected');
      this.emit('disconnected');
      logger.info('Zalo disconnected');
    } catch (error) {
      logger.error('Error disconnecting Zalo:', error);
      throw error;
    }
  }

  /**
   * Send message
   */
  async sendMessage(
    chatId: string,
    message: string,
    _options?: Record<string, unknown>
  ): Promise<void> {
    if (!this.page || !this.isConnected()) {
      throw new Error('Zalo not connected');
    }

    return this.executeWithRetry(
      async () => {
        if (!this.page) {
          throw new Error('Zalo page not initialized');
        }

        // Navigate to chat
        await this.page.goto(`https://chat.zalo.me/chat/${chatId}`, {
          waitUntil: 'networkidle2',
        });
        await randomDelay(2000, 3000);

        // Find message input
        await this.page.waitForSelector('textarea[placeholder*="Nhập tin nhắn"], div[contenteditable="true"]', {
          timeout: 5000,
        });

        // Type message
        const inputSelector = 'textarea[placeholder*="Nhập tin nhắn"], div[contenteditable="true"]';
        await this.page.type(inputSelector, message, { delay: 50 });

        await randomDelay(500, 1000);

        // Send message (Enter key)
        await this.page.keyboard.press('Enter');

        await randomDelay(2000, 3000);

        logger.info(`Zalo message sent to ${chatId}`);
      },
      {
        retryableErrors: ['timeout', 'network', 'econnrefused'],
      }
    );
  }

  /**
   * Get chats
   */
  async getChats(): Promise<PlatformChat[]> {
    if (!this.page || !this.isConnected()) {
      throw new Error('Zalo not connected');
    }

    try {
      await this.page.goto('https://chat.zalo.me/', {
        waitUntil: 'networkidle2',
      });
      await randomDelay(2000, 3000);

      const chats = await this.page.evaluate(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const doc = (globalThis as any).document;
        const chatElements = doc?.querySelectorAll('a[href*="/chat/"], [class*="conversation"]') || [];
        
        return Array.from(chatElements).map((el: any) => {
          const href = el.getAttribute('href') || '';
          const chatId = href.match(/\/chat\/([^\/]+)/)?.[1] || 
                        el.getAttribute('data-id') ||
                        Math.random().toString(36);
          const name = el.textContent || 'Unknown';

          return {
            id: chatId,
            name,
            type: 'individual' as const,
          };
        });
      });

      return chats.map((chat) => ({
        id: chat.id,
        name: chat.name,
        type: chat.type,
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
    if (!this.page || !this.isConnected()) {
      throw new Error('Zalo not connected');
    }

    try {
      await this.page.goto(`https://chat.zalo.me/chat/${chatId}`, {
        waitUntil: 'networkidle2',
      });
      await randomDelay(2000, 3000);

      const messages = await this.page.evaluate((chatId: string, limit: number) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const doc = (globalThis as any).document;
        const messageElements = doc?.querySelectorAll('[class*="message"], [class*="msg"]') || [];
        const limitedMessages = Array.from(messageElements).slice(-limit);
        
        return limitedMessages.map((el: any, index: number) => {
          const content = el.textContent || '';
          const messageId = el.getAttribute('data-id') || 
                           `${chatId}-${index}`;

          return {
            id: messageId,
            content,
          };
        });
      }, chatId, limit);

      return messages.map((msg) => ({
        id: msg.id,
        chatId,
        direction: 'incoming' as const,
        content: msg.content,
        contentType: 'text' as const,
        timestamp: new Date(),
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

