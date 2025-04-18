import { URL } from 'url';
import logger from '../utils/logger';
import prisma from '../db/prismaClient';
import { scrapeUrl } from './scraper';
import { Crawler, CrawlJobData, CrawlJobOptions } from './crawler';

interface SitemapNode {
  url: string;
  children: SitemapNode[];
}

export class SitemapCrawler extends Crawler {
  private sitemapTree: SitemapNode;
  private urlToNode: Map<string, SitemapNode> = new Map();

  constructor(job: CrawlJobData) {
    super(job);
    this.sitemapTree = { url: job.startUrl, children: [] };
    this.urlToNode.set(job.startUrl, this.sitemapTree);
  }

  protected override async processPage(
    url: string,
    depth: number,
    parentUrl: string | null,
    isRetry = false,
  ): Promise<void> {
    if (this.visited.has(url)) return;
    this.visited.add(url);

    try {
      const scrapedData = await scrapeUrl(url, {
        useCache: false,
        timeout: this.options.timeout,
        retries: 0,
        useBrowser: this.options.useBrowser,
      });

      this.processedCount++;

      // Add node to sitemap
      let node = this.urlToNode.get(url);
      if (!node) {
        node = { url, children: [] };
        this.urlToNode.set(url, node);
      }

      if (parentUrl) {
        const parentNode = this.urlToNode.get(parentUrl);
        if (parentNode && !parentNode.children.some(child => child.url === url)) {
          parentNode.children.push(node);
        }
      }

      const links = (scrapedData.metadata?.links as Array<{ href: string; text: string }>) || [];
      for (const link of links) {
        const normalized = this.normalizeUrl(link.href, url);
        if (normalized) {
          this.addToQueue(normalized, depth + 1, url);
        }
      }
    } catch (error) {
      logger.error({
        message: 'Failed to process page (sitemap mode)',
        url,
        jobId: this.job.id,
        error,
      });
      this.failedUrls.add(url);
    }
  }

  public override async run(): Promise<{ status: string; failedUrls: string[] }> {
    logger.info({
      message: 'Starting sitemap crawl job',
      jobId: this.job.id,
      startUrl: this.job.startUrl,
      options: this.options,
    });

    await this.updateJobStatus('processing');

    while (this.queue.length > 0) {
      const batchSize = 5;
      const batch = this.queue.splice(0, batchSize);
      const promises = batch.map(item =>
        this.processPage(item.url, item.depth, item.parentUrl ?? null),
      );
      await Promise.all(promises);
      await this.updateJobStatus('processing');
    }

    const finalStatus = this.failedUrls.size === 0 ? 'completed' : 'completed_with_errors';

    // Save sitemap JSON to CrawlJob
    try {
      await prisma.crawlJob.update({
        where: { id: this.job.id },
        data: {
          sitemap: JSON.stringify(this.sitemapTree, null, 2),
          status: finalStatus,
          processedUrls: this.processedCount,
          foundUrls: this.foundCount,
          failedUrls: JSON.stringify(Array.from(this.failedUrls)),
          endTime: new Date(),
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      logger.error({ message: 'Failed to save sitemap to crawl job', jobId: this.job.id, error });
    }

    return { status: finalStatus, failedUrls: Array.from(this.failedUrls) };
  }
}
