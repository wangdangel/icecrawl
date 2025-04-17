import axios from 'axios';
import * as cheerio from 'cheerio';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import logger from '../utils/logger';
import { isCrawlJobCancelled } from './worker';
import prismaMain from '../db/prismaClient';

export interface ForumScraperOptions {
  startUrl: string;
  postSelector: string;
  nextPageSelector: string;
  nextPageText?: string; // Optional: for filtering by link text
  resolveUrl?: (base: string, href: string) => string;
  maxPages?: number;
  output?: 'default' | 'sqlite' | 'file';
  filePath?: string; // For sqlite or file output
  jobId?: string;
}

export interface ForumPost {
  title: string;
  content: string;
  url: string;
  meta: Record<string, any>;
}

export class ForumScraper {
  private options: ForumScraperOptions;
  private posts: ForumPost[] = [];
  private jobId: string | undefined;

  constructor(options: ForumScraperOptions) {
    this.options = options;
    this.jobId = options.jobId;
  }

  public async scrape(): Promise<ForumPost[]> {
    let url: string | null = this.options.startUrl;
    let pageCount = 0;
    let prisma: PrismaClient | null = null;
    let usePrismaFile = this.options.output === 'sqlite' && this.options.filePath;
    logger.info({ message: 'ForumScraper.scrape started', startUrl: url, options: this.options, maxPages: this.options.maxPages });
    const seenUrls = new Set<string>();
    if (usePrismaFile) {
      // Dynamically create a Prisma client with a custom SQLite file
      const dbPath = path.resolve(this.options.filePath!);
      prisma = new PrismaClient({
        datasources: { db: { url: `file:${dbPath}` } }
      });
      logger.info({ message: 'Initialized Prisma with custom SQLite file', dbPath });
    } else {
      prisma = prismaMain;
    }
    try {
      while (url) {
        pageCount++;
        logger.info({ message: 'Scraping page', pageCount, url, maxPages: this.options.maxPages });
        if (this.options.maxPages && pageCount >= this.options.maxPages) {
          logger.info({ message: 'Reached maxPages limit', pageCount, maxPages: this.options.maxPages });
          break;
        }
        if (seenUrls.has(url)) {
          logger.warn({ message: 'Detected pagination loop', url, pageCount });
          break;
        }
        seenUrls.add(url);
        logger.info({ message: 'Scraping page', pageCount, url });
        const html = await this.fetchPage(url);
        logger.info({ message: 'Fetched page HTML', url, htmlLength: html.length });
        const $ = cheerio.load(html);
        const postsThisPage = this.extractPosts($, url);
        logger.info({ message: 'Extracted posts', url, count: postsThisPage.length });
        if (prisma) {
          // Save to custom SQLite DB
          for (const post of postsThisPage) {
            await prisma.forumPost.create({
              data: {
                title: post.title,
                content: post.content,
                url: post.url,
                meta: JSON.stringify(post.meta),
                jobId: this.jobId ? String(this.jobId) : undefined
              }
            });
          }
          logger.info({ message: 'Saved forum posts to database', count: postsThisPage.length, jobId: this.jobId });
        }
        // --- CANCELLATION CHECK ---
        if (this.options.jobId) {
          const isCancelled = await isCrawlJobCancelled(this.options.jobId);
          if (isCancelled) {
            logger.info({ message: 'ForumScraper.scrape detected job cancellation', jobId: this.options.jobId, pageCount });
            break;
          }
        }
        url = this.getNextPageUrl($, url);
        logger.info({ message: 'Next page URL', nextUrl: url });
      }
      logger.info({ message: 'ForumScraper.scrape finished', totalPages: pageCount, totalPosts: this.posts.length });
    } catch (err: any) {
      logger.error({ message: 'Error in ForumScraper.scrape', error: err && typeof err === 'object' && 'stack' in err ? err.stack : err });
      throw err;
    } finally {
      if (prisma) await prisma.$disconnect();
    }
    logger.info({ message: 'Exited loop', pageCount, url });
    return this.posts;
  }

  private async fetchPage(url: string): Promise<string> {
    const response = await axios.get(url);
    return response.data;
  }

  private extractPosts($: cheerio.CheerioAPI, pageUrl: string): ForumPost[] {
    const blocks = $(this.options.postSelector);
    const pagePosts: ForumPost[] = [];
    blocks.each((_, el) => {
      const post: ForumPost = {
        title: $(el).find('.story_title').text().trim(),
        content: $(el).find('.story').text().trim(),
        url: pageUrl, // Could be improved to extract the post's permalink
        meta: {
          category: $(el).find('.info-category a').text().trim(),
          genderAge: $(el).find('.info-gender-age').text().trim(),
          upvotes: parseInt($(el).find('.vote-up-number').first().text().trim() || '0', 10),
          downvotes: parseInt($(el).find('.vote-up-number').last().text().trim() || '0', 10),
          commentCount: parseInt($(el).find('.comment-icon div').text().trim() || '0', 10),
          author: $(el).find('.post-bottom .info-left').text().trim(),
          date: this.extractDate($(el).find('.post-bottom .info-left').text()) || '',
        },
      };
      this.posts.push(post);
      pagePosts.push(post);
    });
    return pagePosts;
  }

  private getNextPageUrl($: cheerio.CheerioAPI, baseUrl: string): string | null {
    let nextPageEl = $(this.options.nextPageSelector);
    if (this.options.nextPageText) {
      nextPageEl = nextPageEl.filter((_, el) => $(el).text().trim().startsWith(this.options.nextPageText!));
    }
    const href = nextPageEl.attr('href');
    if (!href) return null;
    if (this.options.resolveUrl) {
      return this.options.resolveUrl(baseUrl, href);
    }
    // Default: resolve relative to base
    try {
      return new URL(href, baseUrl).toString();
    } catch {
      return null;
    }
  }

  private extractDate(text: string): string | null {
    // Try to extract date from author/date string
    const match = /\/(.*)/.exec(text);
    if (match) return match[1].trim();
    return null;
  }
}
