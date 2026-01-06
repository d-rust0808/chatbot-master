/**
 * Browser Manager
 * 
 * WHY: Centralized Puppeteer management
 * - Reuse browser instances
 * - Stealth plugins để tránh detection
 * - Session management
 * - Resource cleanup
 */

import { Browser, Page } from 'puppeteer';
import puppeteerExtra from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { logger } from './logger';

// Apply stealth plugin
puppeteerExtra.use(StealthPlugin());

interface BrowserManagerOptions {
  headless?: boolean;
  proxy?: {
    host: string;
    port: number;
    username?: string;
    password?: string;
  };
  userDataDir?: string; // For session persistence
}

/**
 * Browser Manager class
 * WHY: Singleton pattern để quản lý browser instances
 */
export class BrowserManager {
  private static instance: BrowserManager;
  private browsers: Map<string, Browser> = new Map();
  private pages: Map<string, Page> = new Map();

  private constructor() {
    // Private constructor cho singleton
  }

  /**
   * Get singleton instance
   */
  static getInstance(): BrowserManager {
    if (!BrowserManager.instance) {
      BrowserManager.instance = new BrowserManager();
    }
    return BrowserManager.instance;
  }

  /**
   * Create new browser instance
   * WHY: Mỗi platform connection có thể cần browser riêng
   */
  async createBrowser(
    id: string,
    options: BrowserManagerOptions = {}
  ): Promise<Browser> {
    // Check if browser already exists
    if (this.browsers.has(id)) {
      logger.warn(`Browser ${id} already exists, returning existing instance`);
      return this.browsers.get(id)!;
    }

    const launchOptions: Parameters<typeof puppeteerExtra.launch>[0] = {
      headless: options.headless ?? true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920,1080',
      ],
    };

    // Add proxy if provided
    if (options.proxy) {
      launchOptions.args?.push(`--proxy-server=${options.proxy.host}:${options.proxy.port}`);
    }

    // Add user data dir for session persistence
    if (options.userDataDir) {
      launchOptions.userDataDir = options.userDataDir;
    }

    try {
      logger.info(`Creating browser instance: ${id}`);
      const browser = await puppeteerExtra.launch(launchOptions);
      
      // Store browser
      this.browsers.set(id, browser);

      // Handle browser close
      browser.on('disconnected', () => {
        logger.info(`Browser ${id} disconnected`);
        this.browsers.delete(id);
        this.pages.delete(id);
      });

      return browser;
    } catch (error) {
      logger.error(`Failed to create browser ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get browser instance
   */
  getBrowser(id: string): Browser | undefined {
    return this.browsers.get(id);
  }

  /**
   * Create new page
   */
  async createPage(browserId: string): Promise<Page> {
    const browser = this.browsers.get(browserId);
    if (!browser) {
      throw new Error(`Browser ${browserId} not found`);
    }

    // Check if page already exists
    if (this.pages.has(browserId)) {
      return this.pages.get(browserId)!;
    }

    const page = await browser.newPage();

    // Set viewport
    await page.setViewport({ width: 1920, height: 1080 });

    // Set user agent (randomize để tránh detection)
    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    // Store page
    this.pages.set(browserId, page);

    return page;
  }

  /**
   * Get page instance
   */
  getPage(browserId: string): Page | undefined {
    return this.pages.get(browserId);
  }

  /**
   * Close browser
   */
  async closeBrowser(id: string): Promise<void> {
    const browser = this.browsers.get(id);
    if (browser) {
      await browser.close();
      this.browsers.delete(id);
      this.pages.delete(id);
      logger.info(`Browser ${id} closed`);
    }
  }

  /**
   * Close all browsers
   * WHY: Graceful shutdown
   */
  async closeAll(): Promise<void> {
    const closePromises = Array.from(this.browsers.keys()).map((id) =>
      this.closeBrowser(id)
    );
    await Promise.all(closePromises);
    logger.info('All browsers closed');
  }

  /**
   * Get all active browser IDs
   */
  getActiveBrowsers(): string[] {
    return Array.from(this.browsers.keys());
  }
}

// Export singleton instance
export const browserManager = BrowserManager.getInstance();

