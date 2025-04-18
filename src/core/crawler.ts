import { URL } from 'url';
import * as cheerio from 'cheerio';
import prisma from '../db/prismaClient';
import logger from '../utils/logger';
import { scrapeUrl, ScrapedData } from './scraper';
import { MarkdownService } from '../services/markdownService';
import { requestPool } from '../utils/requestPool'; // Use request pool for concurrency

export type DomainScope = 'strict' | 'parent' | 'subdomains' | 'parent_subdomains' | 'none';

export interface CrawlJobOptions {
  maxDepth?: number | null;
  domainScope?: DomainScope;
  useBrowser?: boolean;
  useCookies?: boolean;
  timeout?: number;
  retries?: number;
  useCache?: boolean;
  browserType?: 'desktop' | 'mobile';
}

export interface CrawlJobData {
  id: string;
  startUrl: string;
  status: string;
  options?: string | null;
  userId?: string | null;
  failedUrls?: string | null;
  processedUrls: number;
  foundUrls: number;
}

export class Crawler {
  protected job: CrawlJobData;
  protected options: CrawlJobOptions;
  protected queue: { url: string; depth: number; parentUrl?: string | null }[] = [];
  protected visited: Set<string> = new Set();
  protected failedUrls: Set<string> = new Set();
  protected processedCount = 0;
  protected foundCount = 0;
  protected startHostname: string;
  protected startDomain: string | null; // e.g., example.com
  protected maxDepth: number | null = null;
  protected domainScope: DomainScope = 'strict';

  constructor(job: CrawlJobData) {
    this.job = job;
    this.options = this.parseOptions(job.options);
    this.maxDepth = this.options.maxDepth ?? null; // null means unlimited
    this.domainScope = this.options.domainScope ?? 'strict';

    const startUrlParsed = new URL(this.job.startUrl);
    this.startHostname = startUrlParsed.hostname;
    this.startDomain = this.extractParentDomain(this.startHostname);

    // Initialize queue with start URL
    this.addToQueue(this.job.startUrl, 0, null);

    // Initialize failed URLs from job data
    if (this.job.failedUrls) {
      try {
        const parsedFailed = JSON.parse(this.job.failedUrls);
        if (Array.isArray(parsedFailed)) {
          parsedFailed.forEach(url => this.failedUrls.add(url));
        }
      } catch (e) {
        logger.warn({
          message: 'Failed to parse existing failedUrls for job',
          jobId: this.job.id,
          error: e,
        });
      }
    }
  }

  protected parseOptions(optionsString?: string | null): CrawlJobOptions {
    if (!optionsString) return {};
    try {
      return JSON.parse(optionsString);
    } catch (error) {
      logger.error({
        message: 'Failed to parse crawl job options',
        jobId: this.job.id,
        options: optionsString,
        error,
      });
      return {};
    }
  }

  protected extractParentDomain(hostname: string): string | null {
    const parts = hostname.split('.');
    // Basic check for common TLDs, not exhaustive (consider using a library like psl for robustness)
    if (parts.length >= 2) {
      // Handle cases like .co.uk - simplistic approach
      if (
        parts.length > 2 &&
        parts[parts.length - 2].length <= 3 &&
        parts[parts.length - 1].length <= 3
      ) {
        if (parts.length >= 3) return parts.slice(-3).join('.');
      }
      return parts.slice(-2).join('.');
    }
    return null;
  }

  protected isWithinScope(url: string): boolean {
    try {
      const parsedUrl = new URL(url);
      const targetHostname = parsedUrl.hostname;

      switch (this.domainScope) {
        case 'strict':
          // Target must exactly match the starting hostname
          return targetHostname === this.startHostname;
        case 'parent':
          // Target must match the starting hostname OR the extracted parent domain
          // e.g., if start is www.example.com, allows www.example.com and example.com
          const targetParentDomain = this.extractParentDomain(targetHostname);
          // Allow if it's the exact start host OR if it matches the extracted parent domain (and a parent domain exists)
          // Allow if it's the exact start host OR if it matches the extracted parent domain (and a parent domain exists)
          return (
            targetHostname === this.startHostname ||
            (!!this.startDomain && targetHostname === this.startDomain)
          );
        case 'subdomains':
          // Target must be a subdomain of the starting hostname's parent domain, AND NOT the parent domain itself.
          // e.g., start 'www.example.com', allows 'sub.example.com', 'www.example.com', but not 'example.com'
          const targetParentForSub = this.extractParentDomain(targetHostname);
          // Check if target parent matches start parent AND target is not the parent domain itself (unless it's the start host)
          return (
            !!this.startDomain &&
            targetParentForSub === this.startDomain &&
            (targetHostname === this.startHostname || targetHostname !== this.startDomain)
          );
        case 'parent_subdomains':
          // Target must match the starting hostname's parent domain OR be a subdomain of the parent domain.
          // e.g., start 'www.example.com', allows 'example.com', 'www.example.com', 'sub.example.com'
          const targetParentForBoth = this.extractParentDomain(targetHostname);
          return !!this.startDomain && targetParentForBoth === this.startDomain;
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

  protected normalizeUrl(url: string, baseUrl: string): string | null {
    try {
      const absoluteUrl = new URL(url, baseUrl);
      absoluteUrl.hash = '';
      // Remove query parameters
      absoluteUrl.search = '';
      // Remove base path prefix if present (flatten relative paths)
      try {
        const basePath = new URL(this.job.startUrl).pathname;
        const basePrefix = basePath.endsWith('/') ? basePath.slice(0, -1) : basePath;
        if (basePrefix && basePrefix !== '/' && absoluteUrl.pathname.startsWith(basePrefix + '/')) {
          absoluteUrl.pathname = absoluteUrl.pathname.slice(basePrefix.length);
        }
      } catch {}
      // Deduplicate .html vs no extension
      if (absoluteUrl.pathname.endsWith('.html')) {
        absoluteUrl.pathname = absoluteUrl.pathname.slice(0, -5);
      }

      const normalized = absoluteUrl.toString();
      logger.debug({ message: 'Normalized URL', url, baseUrl, normalized });
      return normalized;
    } catch (e) {
      logger.warn({ message: 'Failed to normalize URL', url, baseUrl, error: e });
      return null;
    }
  }

  protected addToQueue(url: string, depth: number, parentUrl: string | null): void {
    if (this.maxDepth !== null && depth > this.maxDepth) {
      logger.debug({
        message: 'Skipping URL due to maxDepth',
        url,
        depth,
        maxDepth: this.maxDepth,
        jobId: this.job.id,
      });
      return; // Exceeded max depth
    }

    if (!this.isWithinScope(url)) {
      logger.debug({ message: 'Skipping URL outside scope', url, jobId: this.job.id });
      return; // Outside allowed scope
    }

    if (this.visited.has(url)) {
      logger.debug({ message: 'Skipping URL already visited', url, jobId: this.job.id });
      return;
    }

    if (this.queue.some(item => item.url === url)) {
      logger.debug({ message: 'Skipping URL already in queue', url, jobId: this.job.id });
      return;
    }

    const queueItem: { url: string; depth: number; parentUrl?: string | null } = { url, depth };
    if (parentUrl !== null) {
      queueItem.parentUrl = parentUrl;
    }
    this.queue.push(queueItem);
    this.foundCount++;
    logger.debug({ message: 'Added URL to queue', url, depth, parentUrl, jobId: this.job.id });
  }

  public async run(): Promise<{ status: string; failedUrls: string[] }> {
    logger.info({
      message: 'Starting crawl job',
      jobId: this.job.id,
      startUrl: this.job.startUrl,
      options: this.options,
    });

    await this.updateJobStatus('processing');

    // --- Main Crawl Phase ---
    while (this.queue.length > 0) {
      // # Reason: Process queue in depth-level batches for grouped status updates
      const currentDepth = this.queue[0].depth;
      const batch: { url: string; depth: number; parentUrl?: string | null }[] = [];
      // Extract all URLs at the current depth
      while (this.queue.length > 0 && this.queue[0].depth === currentDepth) {
        batch.push(this.queue.shift()!);
      }
      // Process all pages at this depth concurrently
      const promises = batch.map(item =>
        requestPool.add(() => this.processPage(item.url, item.depth, item.parentUrl ?? null)),
      );
      await Promise.all(promises);

      // Update progress after processing this depth
      await this.updateJobStatus('processing');
    }

    logger.info({
      message: 'Main crawl phase completed',
      jobId: this.job.id,
      processed: this.processedCount,
      found: this.foundCount,
    });

    // --- Retry Phase ---
    if (this.failedUrls.size > 0) {
      logger.info({
        message: 'Starting retry phase for failed URLs',
        jobId: this.job.id,
        count: this.failedUrls.size,
      });
      const retryUrls = Array.from(this.failedUrls);
      this.failedUrls.clear(); // Clear original set, processPage will re-add if retry fails

      // Remove URLs from visited set before retrying
      retryUrls.forEach(url => this.visited.delete(url));

      const retryPromises = retryUrls.map(url =>
        requestPool.add(() => this.processPage(url, 0, null, true)),
      ); // Retry at depth 0, mark as retry
      await Promise.all(retryPromises);

      logger.info({
        message: 'Retry phase completed',
        jobId: this.job.id,
        remainingFailed: this.failedUrls.size,
      });
    }

    // --- Finalize ---
    const finalStatus = this.failedUrls.size === 0 ? 'completed' : 'completed_with_errors';
    await this.updateJobStatus(finalStatus, true); // Mark as finished

    return { status: finalStatus, failedUrls: Array.from(this.failedUrls) };
  }

  protected async processPage(
    url: string,
    depth: number,
    parentUrl: string | null,
    isRetry = false,
  ): Promise<void> {
    if (this.visited.has(url)) {
      return;
    }
    this.visited.add(url);

    try {
      // # Reason: Use scrapeUrl to fetch and parse, applying job options.
      const scrapedData: ScrapedData = await scrapeUrl(url, {
        useCache: false, // Force fresh fetch to avoid stale/minimal cached content
        timeout: this.options.timeout,
        retries: 0, // Disable scrapeUrl's internal retries, worker handles retry phase
        useBrowser: this.options.useBrowser,
        useCookies: this.options.useCookies, // Pass useCookies to scraper
        browserType: this.options.browserType, // Pass browserType to scraper
      });

      logger.debug({
        message: 'Fetched page content snippet',
        url,
        snippet: scrapedData.content?.substring(0, 500),
        jobId: this.job.id,
      });

      // Parse canonical URL if present
      let canonicalUrl: string | null = null;
      try {
        if (scrapedData.content) {
          const $ = cheerio.load(scrapedData.content);
          const canonicalLink = $('link[rel="canonical"]').attr('href');
          if (canonicalLink) {
            const normalizedCanonical = this.normalizeUrl(canonicalLink, url);
            if (normalizedCanonical) {
              canonicalUrl = normalizedCanonical;
              logger.debug({
                message: 'Found canonical URL',
                url,
                canonicalUrl,
                jobId: this.job.id,
              });
            }
          }
        }
      } catch (e) {
        logger.warn({ message: 'Failed to parse canonical URL', url, error: e });
      }

      const redirectedUrl = this.normalizeUrl(scrapedData.url, url) || url;
      const effectiveUrl = canonicalUrl || redirectedUrl;

      // # Reason: Convert extracted content to Markdown.
      const markdownContent = MarkdownService.convertHtmlToMarkdown(
        scrapedData.content,
        effectiveUrl,
      );

      // # Reason: Store results (including Markdown) in the database.
      await prisma.scrapedPage.upsert({
        where: { url: effectiveUrl },
        update: {
          title: scrapedData.title,
          content: scrapedData.content || '',
          metadata: JSON.stringify(scrapedData.metadata),
          markdownContent: markdownContent, // Save markdown
          crawlJobId: this.job.id,
          parentUrl: parentUrl,
          updatedAt: new Date(),
        },
        create: {
          url: effectiveUrl,
          title: scrapedData.title,
          content: scrapedData.content || '',
          metadata: JSON.stringify(scrapedData.metadata),
          markdownContent: markdownContent, // Save markdown
          userId: this.job.userId,
          crawlJobId: this.job.id,
          parentUrl: parentUrl,
        },
      });

      this.processedCount++;

      // Extract links: use metadata if available, else parse HTML anchors
      let links: Array<{ href: string; text: string }> =
        (scrapedData.metadata?.links as Array<{ href: string; text: string }>) || [];
      if (links.length === 0 && scrapedData.content) {
        const $ = cheerio.load(scrapedData.content);
        links = [];
        $('a[href]').each((_, el) => {
          const href = $(el).attr('href');
          if (href) {
            links.push({ href, text: $(el).text() });
          }
        });
      }
      logger.debug({ message: 'Found links count', count: links.length, url, jobId: this.job.id });
      for (const link of links) {
        const normalized = this.normalizeUrl(link.href, effectiveUrl);
        logger.debug({
          message: 'Found link',
          href: link.href,
          normalized,
          fromUrl: effectiveUrl,
          jobId: this.job.id,
        });
        if (normalized) {
          this.addToQueue(normalized, depth + 1, effectiveUrl);
        } else {
          logger.debug({
            message: 'Skipping link due to normalization failure',
            href: link.href,
            fromUrl: effectiveUrl,
            jobId: this.job.id,
          });
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error processing page';
      logger.error({
        message: 'Failed to process page',
        url,
        jobId: this.job.id,
        error: errorMessage,
      });
      // # Reason: Add URL to failed set for potential retry.
      this.failedUrls.add(url);
    }
  }

  protected async updateJobStatus(status: string, finished = false): Promise<void> {
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
      logger.error({
        message: 'Failed to update crawl job status',
        jobId: this.job.id,
        status,
        error,
      });
    }
  }
}
