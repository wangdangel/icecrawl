import { PrismaClient } from '@prisma/client'; // Remove ScrapeJob from import
import logger from '../utils/logger';
import { scrapeUrl } from './scraper'; // Assuming scrapeUrl handles the actual scraping

const prisma = new PrismaClient();
const POLLING_INTERVAL_MS = 10000; // Check for jobs every 10 seconds
let isProcessing = false; // Simple lock to prevent overlapping runs

async function processPendingJobs() {
  if (isProcessing) {
    logger.info('Job processing is already running. Skipping this interval.');
    return;
  }

  isProcessing = true;
  logger.info('Checking for pending scrape jobs...');

  try {
    const pendingJobs = await prisma.scrapeJob.findMany({
      where: { status: 'pending' },
      orderBy: { createdAt: 'asc' }, // Process oldest first
      take: 5, // Limit the number of jobs processed per interval
    });

    if (pendingJobs.length === 0) {
      logger.info('No pending jobs found.');
      isProcessing = false;
      return;
    }

    logger.info(`Found ${pendingJobs.length} pending jobs. Processing...`);

    for (const job of pendingJobs) {
      await processJob(job);
    }

  } catch (error) {
    logger.error({ message: 'Error fetching pending jobs', error: error instanceof Error ? error.message : 'Unknown error' });
  } finally {
    isProcessing = false;
    logger.info('Finished job processing cycle.');
  }
}

// Let TypeScript infer the type of 'job'
async function processJob(job: any) { // Use 'any' or let inference work; removing explicit type
  logger.info(`Processing job ${job.id} for URL: ${job.url}`);
  let jobOptions = {};

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
        logger.warn({ message: `Failed to parse options for job ${job.id}`, options: job.options, error: parseError });
        // Decide if you want to proceed without options or fail the job
      }
    }
    
    // Extract options
    const useBrowser = (jobOptions as any)?.useBrowser || false; 
    const category = (jobOptions as any)?.category;
    const notes = (jobOptions as any)?.notes;

    // Perform the actual scraping
    const scrapedData = await scrapeUrl(job.url, useBrowser); // Pass useBrowser option

    // Save the scraped data to ScrapedPage
    // Ensure metadata is stringified if it's an object
    const metadataString = typeof scrapedData.metadata === 'object' 
      ? JSON.stringify(scrapedData.metadata) 
      : scrapedData.metadata; 

    // Use upsert to handle both creation and updates (e.g., on retry)
    const savedPage = await prisma.scrapedPage.upsert({
      where: { url: scrapedData.url }, // Unique constraint field
      update: { // Data to update if record exists
        title: scrapedData.title,
        content: scrapedData.content || '',
        metadata: metadataString,
        updatedAt: new Date(), // Explicitly update timestamp
        // Optionally update category/notes if they changed, or leave them
        // category: category, 
        // notes: notes,
      },
      create: { // Data to create if record doesn't exist
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
        resultId: savedPage.id, // Link to the actual ScrapedPage record ID
        error: null,
      },
    });
    logger.info(`Job ${job.id} completed successfully.`);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error during scraping';
    logger.error({ message: `Error processing job ${job.id}`, error: errorMessage, url: job.url });
    // Update job status to failed
    try {
      await prisma.scrapeJob.update({
        where: { id: job.id },
        data: { status: 'failed', endTime: new Date(), error: errorMessage },
      });
    } catch (updateError) {
      logger.error({ message: `Failed to update job ${job.id} status to failed`, error: updateError });
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
