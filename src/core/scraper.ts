import * as cheerio from 'cheerio';
import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';
import { CacheService } from '../services/cacheService';
import { extractMainContent, extractMetadata, extractLinks } from '../utils/contentExtractor';
import { requestPool } from '../utils/requestPool';
import { httpClient, createHttpClient } from '../utils/httpClient';
import { PerformanceMonitor } from '../utils/performance';
import crypto from 'crypto';

// Initialize Prisma client
const prisma = new PrismaClient();

/**
 * Represents the structure of scraped data
 */
export interface ScrapedData {
  url: string;
  title: string;
  content: string;
  metadata: Record<string, unknown>;
  timestamp: string;
}

/**
 * Generate a cache key for a URL
 * 
 * @param url - The URL to generate a cache key for
 * @returns Cache key
 */
function generateCacheKey(url: string): string {
  return `scrape_${crypto.createHash('md5').update(url).digest('hex')}`;
}

/**
 * Scrapes the content from a given URL
 * 
 * @param url - The URL to scrape
 * @param options - Scraping options
 * @returns Promise resolving to the scraped data
 */
export async function scrapeUrl(
  url: string, 
  options: { 
    useCache?: boolean; 
    cacheTtl?: number;
    timeout?: number;
    retries?: number;
  } = {}
): Promise<ScrapedData> {
  return PerformanceMonitor.measure('scrape_total', async () => {
    // Default options
    const { 
      useCache = true, 
      cacheTtl, 
      timeout = 10000,
      retries = 3
    } = options;
    
    // Generate cache key
    const cacheKey = generateCacheKey(url);
    
    // Check cache if enabled
    if (useCache) {
      const cachedData = CacheService.get<ScrapedData>(cacheKey);
      if (cachedData) {
        logger.info({ message: 'Serving from cache', url });
        return cachedData;
      }
    }
    
    // Execute the scraping task within the request pool
    return requestPool.add(async () => {
      try {
        logger.info({ message: 'Starting scrape', url });
        
        // Create a custom client for this request if needed
        const client = (timeout !== 10000 || retries !== 3) 
          ? createHttpClient({ timeout, retries })
          : httpClient;
        
        // Fetch the HTML content with performance monitoring
        const response = await PerformanceMonitor.measure(
          'scrape_fetch', 
          () => client.get(url),
          { url }
        );
        
        const html = response.data;
        
        // Parse HTML with performance monitoring
        const $ = await PerformanceMonitor.measure(
          'scrape_parse',
          () => cheerio.load(html),
          { url }
        );
        
        // Extract title
        const title = $('title').text().trim() || 'No title found';
        
        // Extract main content using optimized extractor with performance monitoring
        const content = await PerformanceMonitor.measure(
          'scrape_extract_content',
          () => extractMainContent(html),
          { url }
        );
        
        // Extract metadata with performance monitoring
        const metadata = await PerformanceMonitor.measure(
          'scrape_extract_metadata',
          () => extractMetadata($),
          { url }
        );
        
        // Extract links with performance monitoring
        const links = await PerformanceMonitor.measure(
          'scrape_extract_links',
          () => extractLinks($),
          { url }
        );
        
        // Create timestamp
        const timestamp = new Date().toISOString();
        
        // Construct the result
        const scrapedData: ScrapedData = {
          url,
          title,
          content,
          metadata: {
            ...metadata,
            links,
          },
          timestamp,
        };
        
        // Store in cache with performance monitoring
        if (useCache) {
          await PerformanceMonitor.measure(
            'scrape_cache',
            () => CacheService.set(cacheKey, scrapedData, cacheTtl),
            { url }
          );
        }
        
        // Store in database with performance monitoring
        await PerformanceMonitor.measure(
          'scrape_db',
          () => storeScrapedData(scrapedData),
          { url }
        );
        
        return scrapedData;
      } catch (error) {
        logger.error({ 
          message: 'Scrape failed',
          url,
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        });
        
        if (error instanceof Error) {
          throw new Error(`Failed to scrape URL (${url}): ${error.message}`);
        }
        throw new Error(`Failed to scrape URL (${url}): Unknown error`);
      }
    });
  }, { url });
}

/**
 * Stores the scraped data in the database
 * 
 * @param data - The scraped data to store
 */
async function storeScrapedData(data: ScrapedData): Promise<void> {
  try {
    await prisma.scrapedPage.upsert({
      where: { url: data.url },
      update: {
        title: data.title,
        content: data.content,
        metadata: JSON.stringify(data.metadata),
        updatedAt: new Date(),
      },
      create: {
        url: data.url,
        title: data.title,
        content: data.content,
        metadata: JSON.stringify(data.metadata),
      },
    });
    
    logger.info({
      message: 'Saved to database',
      url: data.url,
    });
  } catch (error) {
    logger.error({
      message: 'Database storage error',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
}
