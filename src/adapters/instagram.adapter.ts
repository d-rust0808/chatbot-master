/**
 * Instagram Platform Adapter
 * 
 * WHY: Instagram DM integration sử dụng Puppeteer
 * - Login với credentials
 * - Navigate to Instagram DMs
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
import { randomDelay } from '../utils/human-behavior';
import { Page, Browser } from 'puppeteer';

/**
 * Instagram Adapter
 * WHY: Instagram DM automation với Puppeteer
 */
export class InstagramAdapter extends BasePlatformAdapter {
  private browser?: Browser;
  private page?: Page;
  private messageListeners: Set<(message: PlatformMessage) => void> = new Set();

  constructor() {
    super('instagram');
  }

  /**
   * Connect to Instagram
   * WHY: Login và navigate to DMs
   */
  async connect(config: PlatformConnectionConfig): Promise<void> {
    try {
      this.setStatus('connecting');
      this.config = config;

      // Get browser instance
      const connectionId = config.credentials?.connectionId as string | undefined;
      this.browser = await browserManager.createBrowser(
        connectionId || `instagram-${Date.now()}`,
        {
          headless: true,
          userDataDir: connectionId ? `./sessions/instagram-${connectionId}` : undefined,
        }
      );

      // Create new page
      this.page = await this.browser.newPage();
      await this.page.setViewport({ width: 1920, height: 1080 });

      // Navigate to Instagram login
      await this.page.goto('https://www.instagram.com/accounts/login/', {
        waitUntil: 'networkidle2',
      });

      await randomDelay(2000, 3000);

      // Login với credentials
      const username = config.credentials?.username as string | undefined;
      const password = config.credentials?.password as string | undefined;

      if (!username || !password) {
        throw new Error('Instagram username and password are required');
      }

      // Fill login form
      await this.page.type('input[name="username"]', username, { delay: 100 });
      await randomDelay(500, 1000);

      await this.page.type('input[name="password"]', password, { delay: 100 });
      await randomDelay(500, 1000);

      // Click login button
      await this.page.click('button[type="submit"]');
      await randomDelay(3000, 5000);

      // Check for 2FA or security check
      if (this.page) {
        const currentUrl = this.page.url();
        if (currentUrl.includes('challenge') || currentUrl.includes('two_factor')) {
          logger.warn('Instagram requires 2FA or security check');
          this.setStatus('authenticating');
          this.emit('authenticating', {
            type: '2fa',
            message: 'Please complete 2FA or security check in browser',
          });
          await this.waitForAuthentication();
        }
      }

      // Navigate to DMs
      await this.page.goto('https://www.instagram.com/direct/inbox/', {
        waitUntil: 'networkidle2',
      });

      await randomDelay(2000, 3000);

      // Verify we're logged in
      const isLoggedIn = await this.checkLoggedIn();
      if (!isLoggedIn) {
        throw new Error('Failed to login to Instagram');
      }

      // Start listening for messages
      await this.startMessageListener();

      this.setStatus('connected');
      this.emit('connected');
      logger.info('Instagram connected successfully');
    } catch (error) {
      this.setStatus('error');
      logger.error('Failed to connect to Instagram:', error);
      throw error;
    }
  }

  /**
   * Wait for authentication (2FA, security check)
   */
  private async waitForAuthentication(): Promise<void> {
    if (!this.page) return;

    await this.page.waitForFunction(
      () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const win = (globalThis as any).window;
        return !win?.location.href.includes('challenge') &&
               !win?.location.href.includes('two_factor');
      },
      { timeout: 300000 } // 5 minutes
    );

    await randomDelay(2000, 3000);
  }

  /**
   * Check if logged in
   */
  private async checkLoggedIn(): Promise<boolean> {
    if (!this.page) return false;

    try {
      const inboxLoaded = await this.page.evaluate(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const doc = (globalThis as any).document;
        return doc?.querySelector('[role="main"]') !== null ||
               doc?.querySelector('a[href="/direct/inbox/"]') !== null;
      });

      return inboxLoaded;
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
    }, 5000); // Check every 5 seconds (Instagram has strict rate limits)

    logger.info('Instagram message listener started');
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
        const unreadElements = doc?.querySelectorAll('[aria-label*="unread"], [class*="unread"]') || [];
        
        return Array.from(unreadElements).map((el: any) => {
          const chatElement = el.closest('a[href*="/direct/t/"]');
          if (!chatElement) return null;

          const href = chatElement.getAttribute('href') || '';
          const chatId = href.match(/\/direct\/t\/([^\/]+)/)?.[1] || 
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
      // Open chat
      await this.page.goto(`https://www.instagram.com/direct/t/${chatId}/`, {
        waitUntil: 'networkidle2',
      });
      await randomDelay(2000, 3000);

      // Get latest message
      const message = await this.page.evaluate(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const doc = (globalThis as any).document;
        const messages = doc?.querySelectorAll('[role="row"]') || [];
        const lastMessage = messages[messages.length - 1];
        
        if (!lastMessage) return null;

        const content = lastMessage.textContent || '';
        const messageId = lastMessage.getAttribute('data-testid') || 
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
      logger.info('Instagram disconnected');
    } catch (error) {
      logger.error('Error disconnecting Instagram:', error);
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
      throw new Error('Instagram not connected');
    }

    return this.executeWithRetry(
      async () => {
        if (!this.page) {
          throw new Error('Instagram page not initialized');
        }

        // Navigate to chat
        await this.page.goto(`https://www.instagram.com/direct/t/${chatId}/`, {
          waitUntil: 'networkidle2',
        });
        await randomDelay(2000, 3000);

        // Find message input
        await this.page.waitForSelector('textarea[placeholder*="Message"]', {
          timeout: 5000,
        });

        // Type message
        await this.page.type('textarea[placeholder*="Message"]', message, {
          delay: 50,
        });

        await randomDelay(500, 1000);

        // Send message (Enter key)
        await this.page.keyboard.press('Enter');

        await randomDelay(2000, 3000);

        logger.info(`Instagram message sent to ${chatId}`);
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
      throw new Error('Instagram not connected');
    }

    try {
      await this.page.goto('https://www.instagram.com/direct/inbox/', {
        waitUntil: 'networkidle2',
      });
      await randomDelay(2000, 3000);

      const chats = await this.page.evaluate(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const doc = (globalThis as any).document;
        const chatElements = doc?.querySelectorAll('a[href*="/direct/t/"]') || [];
        
        return Array.from(chatElements).map((el: any) => {
          const href = el.getAttribute('href') || '';
          const chatId = href.match(/\/direct\/t\/([^\/]+)/)?.[1] || 
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
      throw new Error('Instagram not connected');
    }

    try {
      await this.page.goto(`https://www.instagram.com/direct/t/${chatId}/`, {
        waitUntil: 'networkidle2',
      });
      await randomDelay(2000, 3000);

      const messages = await this.page.evaluate((chatId: string, limit: number) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const doc = (globalThis as any).document;
        const messageElements = doc?.querySelectorAll('[role="row"]') || [];
        const limitedMessages = Array.from(messageElements).slice(-limit);
        
        return limitedMessages.map((el: any, index: number) => {
          const content = el.textContent || '';
          const messageId = el.getAttribute('data-testid') || 
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

