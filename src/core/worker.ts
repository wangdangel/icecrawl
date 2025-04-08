// Remove explicit type imports - rely on inference
import prisma from '../db/prismaClient'; // Import shared instance
import logger from '../utils/logger';
import { scrapeUrl } from './scraper';
import { Crawler } from './crawler'; // Import the new Crawler class

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
      logger.error({ message: 'Error fetching pending scrape jobs', error: error instanceof Error ? error.message : 'Unknown error' });
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

      if (pendingCrawlJobs.length > 0) {
        logger.info(`Found ${pendingCrawlJobs.length} pending crawl job(s). Processing...`);
        for (const job of pendingCrawlJobs) {
          await processCrawlJob(job); // Use new function
        }
      } else {
        logger.info('No pending crawl jobs found.');
      }
    } catch (error) {
      logger.error({ message: 'Error fetching pending crawl jobs', error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      isCrawlProcessing = false;
      logger.info('Finished crawl job processing cycle.');
    }
  }
}

// Renamed function for processing single scrape jobs
async function processScrapeJob(job: any) { // Use 'any' or rely on inference
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
        logger.warn({ message: `Failed to parse options for scrape job ${job.id}`, options: job.options, error: parseError });
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
    const metadataString = typeof scrapedData.metadata === 'object' 
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
      }
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
    logger.error({ message: `Error processing scrape job ${job.id}`, error: errorMessage, url: job.url });
    // Update job status to failed
    try {
      await prisma.scrapeJob.update({
        where: { id: job.id },
        data: { status: 'failed', endTime: new Date(), error: errorMessage },
      });
    } catch (updateError) {
      logger.error({ message: `Failed to update scrape job ${job.id} status to failed`, error: updateError });
    }
  }
}

// New function for processing crawl jobs
import { SitemapCrawler } from './sitemapCrawler';

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
    } else {
      crawler = new Crawler(job);
    }

    const result = await crawler.run();

    logger.info({ message: `Crawl job ${job.id} finished`, status: result.status, failedCount: result.failedUrls.length });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error during crawl';
    logger.error({ message: `Fatal error processing crawl job ${job.id}`, error: errorMessage, startUrl: job.startUrl });
    try {
      await prisma.crawlJob.update({
        where: { id: job.id },
        data: { status: 'failed', endTime: new Date(), error: errorMessage },
      });
    } catch (updateError) {
      logger.error({ message: `Failed to update crawl job ${job.id} status to failed`, error: updateError });
    }
  }
}


export function startWorker() {
  logger.info('Starting background job worker...');
  // Run immediately and then set interval
  processPendingJobs();
  setInterval(processPendingJobs, POLLING_INTERVAL_MS);
  logger.info(`Worker started. Polling interval: ${POLLING_INTERVAL_MS / 1000} seconds.`);
}
