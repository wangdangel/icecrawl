import * as puppeteer from 'puppeteer'; // Import as namespace
import logger from '../utils/logger';

/**
 * Browser service for handling JavaScript-heavy sites
 */
export class BrowserService {
  private static browser: puppeteer.Browser | null = null;

  /**
   * Initialize the browser instance
   */
  static async initialize(): Promise<void> {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: 'new' as any,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      logger.info('Browser service initialized');
    }
  }

  /**
   * Scrape content from a JavaScript-heavy site
   *
   * @param url - URL to scrape
   * @param options - Scraping options (now supports browserType: 'desktop' | 'mobile')
   * @returns HTML content after JavaScript execution
   */
  static async scrapeWithBrowser(
    url: string,
    options: {
      waitForSelector?: string;
      waitTime?: number;
      scrollToBottom?: boolean;
      evaluateScript?: string;
      browserType?: 'desktop' | 'mobile'; // Add browserType option
    } = {},
  ): Promise<string> {
    await this.initialize();

    const page = await this.browser!.newPage();

    try {
      // Set user agent and viewport based on browserType
      if (options.browserType === 'mobile') {
        // Mobile emulation
        await page.setUserAgent(
          'Mozilla/5.0 (Linux; Android 12; Pixel 6 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.234 Mobile Safari/537.36 Brave/1.62.162',
        );
        await page.setViewport({
          width: 412,
          height: 915,
          isMobile: true,
          deviceScaleFactor: 2.625,
        });
        // Add fake mobile plugins and cookies
        await page.evaluateOnNewDocument(() => {
          // @ts-ignore
          Object.defineProperty(navigator, 'plugins', {
            get: () => [
              {
                name: 'Chrome PDF Plugin',
                filename: 'internal-pdf-viewer',
                description: 'Portable Document Format',
              },
              {
                name: 'Chrome PDF Viewer',
                filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai',
                description: '',
              },
              {
                name: 'Brave Wallet',
                filename: 'brave-wallet',
                description: 'Brave Wallet Extension',
              },
              {
                name: 'Widevine Content Decryption Module',
                filename: 'widevinecdmadapter.dll',
                description: 'Enables Widevine licenses for HTML audio/video',
              },
              { name: 'Native Client', filename: 'internal-nacl-plugin', description: '' },
            ],
          });
        });
        await page.setCookie(
          {
            name: 'CONSENT',
            value: 'YES+1',
            domain: '.google.com',
            path: '/',
            expires: Math.floor(Date.now() / 1000) + 31536000,
          },
          {
            name: 'BraveRewards',
            value: 'enabled',
            domain: '.brave.com',
            path: '/',
            expires: Math.floor(Date.now() / 1000) + 31536000,
          },
          {
            name: 'sessionid',
            value: 'fake-session-id-123',
            domain: '.example.com',
            path: '/',
            expires: Math.floor(Date.now() / 1000) + 31536000,
          },
        );
      } else {
        // Desktop emulation (default)
        await page.setUserAgent(
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.234 Safari/537.36 Brave/1.62.162',
        );
        await page.setViewport({ width: 1366, height: 768, isMobile: false, deviceScaleFactor: 1 });
        // Add fake desktop plugins and cookies
        await page.evaluateOnNewDocument(() => {
          // @ts-ignore
          Object.defineProperty(navigator, 'plugins', {
            get: () => [
              {
                name: 'Chrome PDF Plugin',
                filename: 'internal-pdf-viewer',
                description: 'Portable Document Format',
              },
              {
                name: 'Chrome PDF Viewer',
                filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai',
                description: '',
              },
              {
                name: 'Brave Wallet',
                filename: 'brave-wallet',
                description: 'Brave Wallet Extension',
              },
              {
                name: 'Widevine Content Decryption Module',
                filename: 'widevinecdmadapter.dll',
                description: 'Enables Widevine licenses for HTML audio/video',
              },
              { name: 'Native Client', filename: 'internal-nacl-plugin', description: '' },
            ],
          });
        });
        await page.setCookie(
          {
            name: 'CONSENT',
            value: 'YES+1',
            domain: '.google.com',
            path: '/',
            expires: Math.floor(Date.now() / 1000) + 31536000,
          },
          {
            name: 'BraveRewards',
            value: 'enabled',
            domain: '.brave.com',
            path: '/',
            expires: Math.floor(Date.now() / 1000) + 31536000,
          },
          {
            name: 'sessionid',
            value: 'fake-session-id-123',
            domain: '.example.com',
            path: '/',
            expires: Math.floor(Date.now() / 1000) + 31536000,
          },
        );
      }

      // Navigate to the page
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

      // Wait for specific selector if provided
      if (options.waitForSelector) {
        await page.waitForSelector(options.waitForSelector, { timeout: 10000 }).catch(() => {
          logger.warn(`Selector "${options.waitForSelector}" not found`);
        });
      }

      // Wait additional time if specified
      if (options.waitTime) {
        await (page as any).waitForTimeout(options.waitTime);
      }

      // Scroll to bottom if needed (for lazy-loaded content)
      if (options.scrollToBottom) {
        await page.evaluate(() => {
          window.scrollTo(0, document.body.scrollHeight);
        });
        await (page as any).waitForTimeout(2000);
      }

      // Execute custom evaluation script if provided
      if (options.evaluateScript) {
        await page.evaluate(options.evaluateScript);
      }

      // Get the page content
      const content = await page.content();

      logger.info({
        message: 'Browser scrape completed',
        url,
        browserType: options.browserType || 'desktop',
      });

      return content;
    } finally {
      await page.close();
    }
  }

  /**
   * Take a screenshot of a page
   *
   * @param url - URL to screenshot
   * @param options - Screenshot options
   * @returns Buffer containing the screenshot
   */
  static async takeScreenshot(
    url: string,
    options: {
      fullPage?: boolean;
      waitForSelector?: string;
      waitTime?: number;
    } = {},
  ): Promise<Buffer> {
    await this.initialize();

    const page = await this.browser!.newPage();

    try {
      await page.setViewport({ width: 1366, height: 768 });
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

      if (options.waitForSelector) {
        await page.waitForSelector(options.waitForSelector, { timeout: 10000 }).catch(() => {
          logger.warn(`Selector "${options.waitForSelector}" not found`);
        });
      }

      if (options.waitTime) {
        await (page as any).waitForTimeout(options.waitTime);
      }

      return await page.screenshot({
        fullPage: options.fullPage || false,
        type: 'png',
      });
    } finally {
      await page.close();
    }
  }

  /**
   * Close the browser instance
   */
  static async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      logger.info('Browser service closed');
    }
  }
}
