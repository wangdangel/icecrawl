// Remove explicit type imports - rely on inference
import prisma from '../db/prismaClient'; // Import shared instance
import logger from '../utils/logger';
import { scrapeUrl } from './scraper';
import { Crawler } from './crawler'; // Import the new Crawler class
import { SitemapCrawler } from './sitemapCrawler';
import { ForumScraper } from './forumScraper';
const cheerio = require('cheerio');

const POLLING_INTERVAL_MS = 10000; // Check for jobs every 10 seconds
let isScrapeProcessing = false; // Lock for scrape jobs
let isCrawlProcessing = false; // Lock for crawl jobs

async function processPendingJobs() {
  // Process Scrape Jobs (existing logic)
  if (isScrapeProcessing) {
    logger.info('Scrape job processing is already running. Skipping this interval.');
    return;
  } else {
    isScrapeProcessing = true;
    logger.info('Checking for pending scrape jobs...');
    try {
      const pendingScrapeJobs = await prisma.scrapeJob.findMany({
        where: { status: 'pending' },
        orderBy: { createdAt: 'asc' },
        take: 5,
      });

      if (pendingScrapeJobs.length > 0) {
        logger.info(`Found ${pendingScrapeJobs.length} pending scrape jobs. Processing...`);
        for (const job of pendingScrapeJobs) {
          await processScrapeJob(job); // Use renamed function
        }
      } else {
        logger.info('No pending scrape jobs found.');
      }
    } catch (error) {
      logger.error({
        message: 'Error fetching pending scrape jobs',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      isScrapeProcessing = false;
      logger.info('Finished scrape job processing cycle.');
    }
  }

  // Process Crawl Jobs (new logic)
  if (isCrawlProcessing) {
    logger.info('Crawl job processing is already running. Skipping this interval.');
    return;
  } else {
    isCrawlProcessing = true;
    logger.info('Checking for pending crawl jobs...');
    try {
      const pendingCrawlJobs = await prisma.crawlJob.findMany({
        where: { status: 'pending' },
        orderBy: { createdAt: 'asc' },
        take: 1, // Process one crawl job at a time to avoid overwhelming resources
      });

      logger.info({
        message: 'Fetched pending crawl jobs',
        count: pendingCrawlJobs.length,
        jobIds: pendingCrawlJobs.map(j => j.id),
        jobs: pendingCrawlJobs.map(j => ({
          id: j.id,
          status: j.status,
          options: j.options,
          startUrl: j.startUrl,
        })),
      });

      if (pendingCrawlJobs.length > 0) {
        for (const job of pendingCrawlJobs) {
          logger.info({
            message: 'Processing crawl job candidate',
            jobId: job.id,
            status: job.status,
            options: job.options,
            startUrl: job.startUrl,
          });
          let options = {};
          try {
            options = job.options ? JSON.parse(job.options) : {};
            logger.info({ message: 'Parsed job options', jobId: job.id, options });
          } catch (e) {
            logger.error({
              message: 'Failed to parse crawl job options JSON',
              jobId: job.id,
              error: e,
              rawOptions: job.options,
            });
          }
          // Use type guard to avoid TS error
          if (
            options &&
            typeof options === 'object' &&
            'mode' in options &&
            (options as any).mode === 'forum'
          ) {
            logger.info({ message: 'Forum job detected and will be processed', jobId: job.id });
            // Set status to 'processing' as soon as the worker picks up the forum job
            try {
              await prisma.crawlJob.update({
                where: { id: job.id },
                data: { status: 'processing', startTime: new Date(), error: null },
              });
              logger.info({ message: 'Forum job status set to processing', jobId: job.id });
            } catch (e) {
              logger.error({
                message: 'Failed to set forum job status to processing',
                jobId: job.id,
                error: e,
              });
            }
          }
          await processCrawlJob(job); // Use new function
          logger.info({ message: 'Finished processing crawl job candidate', jobId: job.id });
        }
      } else {
        logger.info('No pending crawl jobs found.');
      }
    } catch (error) {
      logger.error({
        message: 'Error fetching pending crawl jobs',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      isCrawlProcessing = false;
      logger.info('Finished crawl job processing cycle.');
    }
  }
}

// Renamed function for processing single scrape jobs
async function processScrapeJob(job: any) {
  // Use 'any' or rely on inference
  logger.info(`Processing scrape job ${job.id} for URL: ${job.url}`);
  let jobOptions: any = {}; // Use 'any' for simplicity or define a specific type

  try {
    // Update status to processing
    await prisma.scrapeJob.update({
      where: { id: job.id },
      data: { status: 'processing', startTime: new Date() },
    });

    // Parse options safely
    if (job.options) {
      try {
        jobOptions = JSON.parse(job.options);
      } catch (parseError) {
        logger.warn({
          message: `Failed to parse options for scrape job ${job.id}`,
          options: job.options,
          error: parseError,
        });
      }
    }

    // Extract options relevant to scrapeUrl
    const useBrowser = jobOptions?.useBrowser || false;
    const category = jobOptions?.category; // Keep category/notes for saving
    const notes = jobOptions?.notes;

    // Perform the actual scraping, passing options and userId correctly
    const scrapedData = await scrapeUrl(job.url, { useBrowser }, job.userId); // Pass userId here

    // Save the scraped data to ScrapedPage
    // Ensure metadata is stringified if it's an object
    const metadataString =
      typeof scrapedData.metadata === 'object'
        ? JSON.stringify(scrapedData.metadata)
        : scrapedData.metadata;

    // Use upsert to handle both creation and updates
    const savedPage = await prisma.scrapedPage.upsert({
      where: { url: scrapedData.url },
      update: {
        title: scrapedData.title,
        content: scrapedData.content || '',
        metadata: metadataString,
        updatedAt: new Date(),
        // Update category/notes if provided in the job options
        ...(category && { category }),
        ...(notes && { notes }),
      },
      create: {
        url: scrapedData.url,
        title: scrapedData.title,
        content: scrapedData.content || '',
        metadata: metadataString,
        userId: job.userId,
        category: category,
        notes: notes,
      },
    });

    // Update job status to completed
    await prisma.scrapeJob.update({
      where: { id: job.id },
      data: {
        status: 'completed',
        endTime: new Date(),
        resultId: savedPage.id,
        error: null,
      },
    });
    logger.info(`Scrape job ${job.id} completed successfully.`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error during scraping';
    logger.error({
      message: `Error processing scrape job ${job.id}`,
      error: errorMessage,
      url: job.url,
    });
    // Update job status to failed
    try {
      await prisma.scrapeJob.update({
        where: { id: job.id },
        data: { status: 'failed', endTime: new Date(), error: errorMessage },
      });
    } catch (updateError) {
      logger.error({
        message: `Failed to update scrape job ${job.id} status to failed`,
        error: updateError,
      });
    }
  }
}

// Helper to check if a crawl job is cancelled
export async function isCrawlJobCancelled(jobId: string): Promise<boolean> {
  const job = await prisma.crawlJob.findUnique({ where: { id: jobId }, select: { status: true } });
  // Treat missing job (deleted) as cancelled
  return !job || job.status === 'cancelled';
}

// New function for processing crawl jobs
async function processCrawlJob(job: any) {
  logger.info(`Processing crawl job ${job.id} for start URL: ${job.startUrl}`);
  try {
    let options: any = {};
    if (job.options) {
      try {
        options = JSON.parse(job.options);
      } catch (e) {
        logger.warn({ message: 'Failed to parse crawl job options JSON', jobId: job.id, error: e });
      }
    }

    const mode = options.mode || 'content';
    let crawler;
    if (mode === 'sitemap') {
      logger.info({ message: 'Starting sitemap crawl mode', jobId: job.id });
      crawler = new SitemapCrawler(job);
    } else if (mode === 'forum') {
      logger.info({ message: 'Starting forum scrape mode', jobId: job.id });
      // Use generic selectors, allow override via job options
      const postSelector = options.postSelector || '.post';
      const nextPageSelector = options.nextPageSelector || 'a.page-link';
      const nextPageText = options.nextPageText || 'Next';
      const output = options.output || 'default';
      const filePath = options.filePath;
      const useCookies = options.useCookies || false;
      const cookieString = options.cookieString || undefined;
      const scraper = new ForumScraper({
        startUrl: job.startUrl,
        postSelector,
        nextPageSelector,
        nextPageText,
        output,
        filePath,
        maxPages: options.maxPages, // Ensure maxPages is passed to the scraper
        jobId: job.id, // Pass jobId for cancellation checks
        useCookies,
        cookieString,
      });
      let cancelled = false;
      try {
        // Run the scraper's own logic (handles pagination, maxPages, DB, etc)
        await scraper.scrape();
      } catch (err) {
        logger.error({ message: 'Error in ForumScraper.scrape', error: err });
        throw err;
      }
      if (await isCrawlJobCancelled(job.id)) {
        cancelled = true;
      }
      await prisma.crawlJob.update({
        where: { id: job.id },
        data: {
          status: cancelled ? 'cancelled' : 'completed',
          endTime: new Date(),
          error: cancelled ? 'Cancelled by user.' : null,
        },
      });
      return;
    } else {
      crawler = new Crawler(job);
    }

    // Default Crawler: just run the crawl
    const result = await crawler.run();
    logger.info({
      message: `Crawl job ${job.id} finished`,
      status: result.status,
      failedCount: result.failedUrls.length,
    });
    const cancelled = await isCrawlJobCancelled(job.id);
    if (cancelled) {
      await prisma.crawlJob.update({
        where: { id: job.id },
        data: { status: 'cancelled', endTime: new Date(), error: 'Cancelled by user.' },
      });
    } else {
      await prisma.crawlJob.update({
        where: { id: job.id },
        data: { status: result.status, endTime: new Date(), error: null },
      });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error during crawl';
    logger.error({
      message: `Fatal error processing crawl job ${job.id}`,
      error: errorMessage,
      startUrl: job.startUrl,
    });
    try {
      await prisma.crawlJob.update({
        where: { id: job.id },
        data: { status: 'failed', endTime: new Date(), error: errorMessage },
      });
    } catch (updateError) {
      logger.error({
        message: `Failed to update crawl job ${job.id} status to failed`,
        error: updateError,
      });
    }
  }
}

export function startWorker() {
  logger.info('Starting background job worker...');
  // Run immediately and then set interval, catch errors
  processPendingJobs().catch(error =>
    logger.error({
      message: 'Unhandled error in processing jobs',
      error: error instanceof Error ? error.message : String(error),
    }),
  );
  setInterval(() => {
    processPendingJobs().catch(error =>
      logger.error({
        message: 'Unhandled error in processing jobs',
        error: error instanceof Error ? error.message : String(error),
      }),
    );
  }, POLLING_INTERVAL_MS);
  logger.info(`Worker started. Polling interval: ${POLLING_INTERVAL_MS / 1000} seconds.`);
}
