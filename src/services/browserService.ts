import * as puppeteer from 'puppeteer'; // Import as namespace
import logger from '../utils/logger.js';

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
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      logger.info('Browser service initialized');
    }
  }
  
  /**
   * Scrape content from a JavaScript-heavy site
   * 
   * @param url - URL to scrape
   * @param options - Scraping options
   * @returns HTML content after JavaScript execution
   */
  static async scrapeWithBrowser(url: string, options: {
    waitForSelector?: string;
    waitTime?: number;
    scrollToBottom?: boolean;
    evaluateScript?: string;
  } = {}): Promise<string> {
    await this.initialize();
    
    const page = await this.browser!.newPage();
    
    try {
      // Set user agent and viewport
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      await page.setViewport({ width: 1366, height: 768 });
      
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
        await page.waitForTimeout(options.waitTime);
      }
      
      // Scroll to bottom if needed (for lazy-loaded content)
      if (options.scrollToBottom) {
        await page.evaluate(() => {
          window.scrollTo(0, document.body.scrollHeight);
        });
        await page.waitForTimeout(2000);
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
  static async takeScreenshot(url: string, options: {
    fullPage?: boolean;
    waitForSelector?: string;
    waitTime?: number;
  } = {}): Promise<Buffer> {
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
        await page.waitForTimeout(options.waitTime);
      }
      
      return await page.screenshot({ 
        fullPage: options.fullPage || false,
        type: 'png' 
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
