import { URL } from 'url';
import * as cheerio from 'cheerio';
import prisma from '../db/prismaClient';
import logger from '../utils/logger';
import { scrapeUrl, ScrapedData } from './scraper';
import { MarkdownService } from '../services/markdownService';
import { requestPool } from '../utils/requestPool'; // Use request pool for concurrency

// Define types for crawl options and job data
type DomainScope = "strict" | "parent" | "subdomains" | "parent_subdomains" | "none";

interface CrawlJobOptions {
  maxDepth?: number | null;
  domainScope?: DomainScope;
  useBrowser?: boolean;
  // Add other relevant options from scrapeUrl if needed (timeout, retries, cache?)
  timeout?: number;
  retries?: number;
  useCache?: boolean;
}

// Interface matching the CrawlJob model structure (adapt as needed)
interface CrawlJobData {
  id: string;
  startUrl: string;
  status: string;
  options?: string | null;
  userId?: string | null;
  failedUrls?: string | null; // Stored as JSON string
  processedUrls: number;
  foundUrls: number;
}

export class Crawler {
  private job: CrawlJobData;
  private options: CrawlJobOptions;
  private queue: { url: string; depth: number }[] = [];
  private visited: Set<string> = new Set();
  private failedUrls: Set<string> = new Set();
  private processedCount = 0;
  private foundCount = 0;
  private startHostname: string;
  private startDomain: string | null; // e.g., example.com
  private maxDepth: number | null = null;
  private domainScope: DomainScope = 'strict';

  constructor(job: CrawlJobData) {
    this.job = job;
    this.options = this.parseOptions(job.options);
    this.maxDepth = this.options.maxDepth ?? null; // null means unlimited
    this.domainScope = this.options.domainScope ?? 'strict';

    const startUrlParsed = new URL(this.job.startUrl);
    this.startHostname = startUrlParsed.hostname;
    this.startDomain = this.extractParentDomain(this.startHostname);

    // Initialize queue with start URL
    this.addToQueue(this.job.startUrl, 0);

    // Initialize failed URLs from job data
    if (this.job.failedUrls) {
      try {
        const parsedFailed = JSON.parse(this.job.failedUrls);
        if (Array.isArray(parsedFailed)) {
          parsedFailed.forEach(url => this.failedUrls.add(url));
        }
      } catch (e) {
        logger.warn({ message: 'Failed to parse existing failedUrls for job', jobId: this.job.id, error: e });
      }
    }
  }

  private parseOptions(optionsString?: string | null): CrawlJobOptions {
    if (!optionsString) return {};
    try {
      return JSON.parse(optionsString);
    } catch (error) {
      logger.error({ message: 'Failed to parse crawl job options', jobId: this.job.id, options: optionsString, error });
      return {};
    }
  }

  private extractParentDomain(hostname: string): string | null {
    const parts = hostname.split('.');
    // Basic check for common TLDs, not exhaustive (consider using a library like psl for robustness)
    if (parts.length >= 2) {
      // Handle cases like .co.uk - simplistic approach
      if (parts.length > 2 && parts[parts.length - 2].length <= 3 && parts[parts.length - 1].length <= 3) {
         if (parts.length >= 3) return parts.slice(-3).join('.');
      }
      return parts.slice(-2).join('.');
    }
    return null;
  }

  private isWithinScope(url: string): boolean {
    try {
      const parsedUrl = new URL(url);
      const targetHostname = parsedUrl.hostname;

      switch (this.domainScope) {
        case 'strict':
          return targetHostname === this.startHostname;
        case 'parent':
          const targetParentDomain = this.extractParentDomain(targetHostname);
          return targetHostname === this.startHostname || (!!this.startDomain && targetHostname === this.startDomain);
        case 'subdomains':
           const targetParent = this.extractParentDomain(targetHostname);
           return !!this.startDomain && targetParent === this.startDomain;
        case 'parent_subdomains':
          const targetParentDomainForBoth = this.extractParentDomain(targetHostname);
          return !!this.startDomain && targetParentDomainForBoth === this.startDomain;
        case 'none':
          return true; // No restriction
        default:
          return false;
      }
    } catch (e) {
      // Invalid URL format
      return false;
    }
  }

  private normalizeUrl(url: string, baseUrl: string): string | null {
    try {
      // Resolve relative URLs and remove fragments (#)
      const absoluteUrl = new URL(url, baseUrl);
      absoluteUrl.hash = ''; // Remove fragment
      return absoluteUrl.toString();
    } catch (e) {
      logger.warn({ message: 'Failed to normalize URL', url, baseUrl, error: e });
      return null;
    }
  }

  private addToQueue(url: string, depth: number): void {
     // # Reason: Check depth limit before adding to queue.
    if (this.maxDepth !== null && depth > this.maxDepth) {
      return; // Exceeded max depth
    }

    // # Reason: Check domain scope before adding to queue.
    if (!this.isWithinScope(url)) {
      return; // Outside allowed scope
    }

    // # Reason: Avoid adding already visited or queued URLs.
    if (!this.visited.has(url) && !this.queue.some(item => item.url === url)) {
      this.queue.push({ url, depth });
      this.foundCount++;
    }
  }

  public async run(): Promise<{ status: string; failedUrls: string[] }> {
    logger.info({ message: 'Starting crawl job', jobId: this.job.id, startUrl: this.job.startUrl, options: this.options });

    await this.updateJobStatus('processing');

    // --- Main Crawl Phase ---
    while (this.queue.length > 0) {
      // # Reason: Process queue in batches matching the default request pool concurrency (5).
      const batchSize = 5; // Use the default concurrency of the requestPool
      const batch = this.queue.splice(0, batchSize);
      const promises = batch.map(item => this.processPage(item.url, item.depth));
      await Promise.all(promises); // Wait for the batch to complete

      // Update progress after each batch
      await this.updateJobStatus('processing'); // Update counts while still processing
    }

    logger.info({ message: 'Main crawl phase completed', jobId: this.job.id, processed: this.processedCount, found: this.foundCount });

    // --- Retry Phase ---
    if (this.failedUrls.size > 0) {
      logger.info({ message: 'Starting retry phase for failed URLs', jobId: this.job.id, count: this.failedUrls.size });
      const retryUrls = Array.from(this.failedUrls); // Copy to avoid modifying set while iterating
      this.failedUrls.clear(); // Clear original set, will re-add if retry fails

      const retryPromises = retryUrls.map(url => this.processPage(url, 0, true)); // Retry at depth 0, mark as retry
      await Promise.all(retryPromises);

      logger.info({ message: 'Retry phase completed', jobId: this.job.id, remainingFailed: this.failedUrls.size });
    }

    // --- Finalize ---
    const finalStatus = this.failedUrls.size === 0 ? 'completed' : 'completed_with_errors';
    await this.updateJobStatus(finalStatus, true); // Mark as finished

    return { status: finalStatus, failedUrls: Array.from(this.failedUrls) };
  }

  private async processPage(url: string, depth: number, isRetry = false): Promise<void> {
    if (this.visited.has(url)) {
      return;
    }
    this.visited.add(url);

    try {
      // # Reason: Use scrapeUrl to fetch and parse, applying job options.
      const scrapedData: ScrapedData = await scrapeUrl(url, {
        useCache: this.options.useCache, // Pass relevant options
        timeout: this.options.timeout,
        retries: 0, // Disable scrapeUrl's internal retries, worker handles retry phase
        useBrowser: this.options.useBrowser,
      });

      // # Reason: Convert extracted content to Markdown.
      const markdownContent = MarkdownService.convertHtmlToMarkdown(scrapedData.content, url);

      // # Reason: Store results (including Markdown) in the database.
      await prisma.scrapedPage.upsert({
        where: { url: scrapedData.url },
        update: {
          title: scrapedData.title,
          content: scrapedData.content || '',
          metadata: JSON.stringify(scrapedData.metadata),
          markdownContent: markdownContent, // Save markdown
          updatedAt: new Date(),
        },
        create: {
          url: scrapedData.url,
          title: scrapedData.title,
          content: scrapedData.content || '',
          metadata: JSON.stringify(scrapedData.metadata),
          markdownContent: markdownContent, // Save markdown
          userId: this.job.userId,
          // Note: We might want to link ScrapedPage to CrawlJob as well
        },
      });

      this.processedCount++;

      // # Reason: Extract links and add valid ones to the queue for further crawling.
      const $ = cheerio.load(scrapedData.content); // Load content to extract links
      $('a[href]').each((_, element) => {
        const href = $(element).attr('href');
        if (href) {
          const normalized = this.normalizeUrl(href, url);
          if (normalized) {
            this.addToQueue(normalized, depth + 1);
          }
        }
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error processing page';
      logger.error({ message: 'Failed to process page', url, jobId: this.job.id, error: errorMessage });
      // # Reason: Add URL to failed set for potential retry.
      this.failedUrls.add(url);
    }
  }

  private async updateJobStatus(status: string, finished = false): Promise<void> {
    try {
      const data: any = {
        status,
        processedUrls: this.processedCount,
        foundUrls: this.foundCount,
        failedUrls: JSON.stringify(Array.from(this.failedUrls)), // Store as JSON string
        updatedAt: new Date(),
      };
      if (finished) {
        data.endTime = new Date();
      }
      await prisma.crawlJob.update({
        where: { id: this.job.id },
        data,
      });
    } catch (error) {
      logger.error({ message: 'Failed to update crawl job status', jobId: this.job.id, status, error });
    }
  }
}
