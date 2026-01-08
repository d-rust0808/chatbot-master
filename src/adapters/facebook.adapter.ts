/**
 * Facebook Messenger Platform Adapter
 * 
 * WHY: Facebook Messenger integration sử dụng Puppeteer
 * - Login với credentials hoặc 2FA
 * - Navigate to Messenger inbox
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
 * Facebook Messenger Adapter
 * WHY: Facebook Messenger automation với Puppeteer
 */
export class FacebookAdapter extends BasePlatformAdapter {
  private browser?: Browser;
  private page?: Page;
  private messageListeners: Set<(message: PlatformMessage) => void> = new Set();

  constructor() {
    super('facebook');
  }

  /**
   * Connect to Facebook Messenger
   * WHY: Login và navigate to Messenger inbox
   */
  async connect(config: PlatformConnectionConfig): Promise<void> {
    try {
      this.setStatus('connecting');
      this.config = config;

      // Get browser instance
      const connectionId = config.credentials?.connectionId as string | undefined;
      this.browser = await browserManager.createBrowser(
        connectionId || `facebook-${Date.now()}`,
        {
          headless: true,
          userDataDir: connectionId ? `./sessions/facebook-${connectionId}` : undefined,
        }
      );

      // Create new page
      this.page = await this.browser.newPage();

      // Set viewport
      await this.page.setViewport({ width: 1920, height: 1080 });

      // Navigate to Facebook login
      await this.page.goto('https://www.facebook.com/login', {
        waitUntil: 'networkidle2',
      });

      await randomDelay(2000, 3000);

      // Login với credentials
      const email = config.credentials?.email as string | undefined;
      const password = config.credentials?.password as string | undefined;

      if (!email || !password) {
        throw new Error('Facebook email and password are required');
      }

      // Fill login form
      await this.page.type('#email', email, { delay: 100 });
      await randomDelay(500, 1000);

      await this.page.type('#pass', password, { delay: 100 });
      await randomDelay(500, 1000);

      // Click login button
      await this.page.click('button[name="login"]');
      await randomDelay(3000, 5000);

      // Check for 2FA or security check
      if (this.page) {
        const currentUrl = this.page.url();
        if (currentUrl.includes('checkpoint') || currentUrl.includes('challenge')) {
          logger.warn('Facebook requires 2FA or security check');
          this.setStatus('authenticating');
          this.emit('authenticating', {
            type: '2fa',
            message: 'Please complete 2FA or security check in browser',
          });
          // Wait for user to complete 2FA
          await this.waitForAuthentication();
        }
      }

      // Navigate to Messenger
      await this.page.goto('https://www.messenger.com', {
        waitUntil: 'networkidle2',
      });

      await randomDelay(2000, 3000);

      // Verify we're logged in
      const isLoggedIn = await this.checkLoggedIn();
      if (!isLoggedIn) {
        throw new Error('Failed to login to Facebook');
      }

      // Start listening for messages
      await this.startMessageListener();

      this.setStatus('connected');
      this.emit('connected');
      logger.info('Facebook Messenger connected successfully');
    } catch (error) {
      this.setStatus('error');
      logger.error('Failed to connect to Facebook:', error);
      throw error;
    }
  }

  /**
   * Wait for authentication (2FA, security check)
   */
  private async waitForAuthentication(): Promise<void> {
    if (!this.page) return;

    // Wait for URL to change (user completed authentication)
    await this.page.waitForFunction(
      () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const win = (globalThis as any).window;
        return !win?.location.href.includes('checkpoint') &&
               !win?.location.href.includes('challenge');
      },
      { timeout: 300000 } // 5 minutes timeout
    );

    await randomDelay(2000, 3000);
  }

  /**
   * Check if logged in
   */
  private async checkLoggedIn(): Promise<boolean> {
    if (!this.page) return false;

    try {
      // Check for Messenger UI elements
      const messengerLoaded = await this.page.evaluate(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const doc = (globalThis as any).document;
        return doc?.querySelector('[role="main"]') !== null ||
               doc?.querySelector('[data-testid="chat-list"]') !== null;
      });

      return messengerLoaded;
    } catch {
      return false;
    }
  }

  /**
   * Start listening for new messages
   */
  private async startMessageListener(): Promise<void> {
    if (!this.page) return;

    // Listen for new messages bằng cách poll DOM
    setInterval(async () => {
      try {
        await this.checkForNewMessages();
      } catch (error) {
        logger.error('Error checking for new messages:', error);
      }
    }, 3000); // Check every 3 seconds

    logger.info('Facebook message listener started');
  }

  /**
   * Check for new messages
   */
  private async checkForNewMessages(): Promise<void> {
    if (!this.page) return;

    try {
      // Get unread message indicators
      const unreadMessages = await this.page.evaluate(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const doc = (globalThis as any).document;
        const unreadElements = doc?.querySelectorAll('[aria-label*="unread"], [data-testid*="unread"]') || [];
        return Array.from(unreadElements).map((el: any) => {
          const chatElement = el.closest('[role="listitem"]');
          if (!chatElement) return null;

          const chatId = chatElement.getAttribute('data-testid') || 
                        chatElement.getAttribute('aria-label') || 
                        Math.random().toString(36);
          
          return { chatId };
        }).filter(Boolean);
      });

      // Process unread messages
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
      // Click on chat to open
      await this.page.click(`[data-testid*="${chatId}"]`);
      await randomDelay(1000, 2000);

      // Get latest message
      const message = await this.page.evaluate(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const doc = (globalThis as any).document;
        const messages = doc?.querySelectorAll('[data-testid*="message"]') || [];
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

        // Emit message event
        this.emit('message', platformMessage);

        // Call registered listeners
        this.messageListeners.forEach((listener) => {
          listener(platformMessage);
        });
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

      // Browser được manage bởi BrowserManager, không close ở đây

      this.setStatus('disconnected');
      this.emit('disconnected');
      logger.info('Facebook Messenger disconnected');
    } catch (error) {
      logger.error('Error disconnecting Facebook:', error);
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
      throw new Error('Facebook not connected');
    }

    return this.executeWithRetry(
      async () => {
        if (!this.page) {
          throw new Error('Facebook page not initialized');
        }

        // Navigate to chat nếu chưa ở đó
        const currentChatId = await this.getCurrentChatId();
        if (currentChatId !== chatId) {
          await this.openChat(chatId);
        }

        // Find message input
        await this.page.waitForSelector('[contenteditable="true"][data-testid*="message"]', {
          timeout: 5000,
        });

        // Type message
        await this.page.type('[contenteditable="true"][data-testid*="message"]', message, {
          delay: 50,
        });

        await randomDelay(500, 1000);

        // Send message (Enter key)
        await this.page.keyboard.press('Enter');

        await randomDelay(1000, 2000);

        logger.info(`Facebook message sent to ${chatId}`);
      },
      {
        retryableErrors: ['timeout', 'network', 'econnrefused'],
      }
    );
  }

  /**
   * Open chat
   */
  private async openChat(chatId: string): Promise<void> {
    if (!this.page) return;

    try {
      // Click on chat in list
      await this.page.click(`[data-testid*="${chatId}"]`);
      await randomDelay(2000, 3000);
    } catch (error) {
      logger.error('Error opening chat:', error);
      throw error;
    }
  }

  /**
   * Get current chat ID
   */
  private async getCurrentChatId(): Promise<string | null> {
    if (!this.page) return null;

    try {
      return await this.page.evaluate(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const doc = (globalThis as any).document;
        const activeChat = doc?.querySelector('[aria-current="page"]');
        return activeChat?.getAttribute('data-testid') || null;
      });
    } catch {
      return null;
    }
  }

  /**
   * Get chats
   */
  async getChats(): Promise<PlatformChat[]> {
    if (!this.page || !this.isConnected()) {
      throw new Error('Facebook not connected');
    }

    try {
      const chats = await this.page.evaluate(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const doc = (globalThis as any).document;
        const chatElements = doc?.querySelectorAll('[role="listitem"]') || [];
        return Array.from(chatElements).map((el: any) => {
          const chatId = el.getAttribute('data-testid') || 
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
   * On message callback
   */
  onMessage(callback: (message: PlatformMessage) => void): void {
    this.messageListeners.add(callback);
  }

  /**
   * Get messages from chat
   */
  async getMessages(chatId: string, limit: number = 50): Promise<PlatformMessage[]> {
    if (!this.page || !this.isConnected()) {
      throw new Error('Facebook not connected');
    }

    try {
      // Open chat
      await this.openChat(chatId);
      await randomDelay(2000, 3000);

      // Get messages
      const messages = await this.page.evaluate((chatId: string, limit: number) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const doc = (globalThis as any).document;
        const messageElements = doc?.querySelectorAll('[data-testid*="message"]') || [];
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
}

