import prisma from '../db/prismaClient'; // Import shared instance
import logger from '../utils/logger';
import type { Prisma, Tag, CrawlJob, ScrapeJob } from '@prisma/client'; // Import types only

// Define interfaces for data structures if needed, or import from shared types
// Consider moving these to a shared types file if used elsewhere
interface PaginationOptions {
  page: number;
  limit: number;
}

// This interface accurately reflects the selection in getRecentScrapes and getAllScrapes
// It's good practice to define return types clearly.
export interface RecentScrapeOutput {
  // Added export
  id: string;
  url: string;
  title: string | null;
  createdAt: Date;
  isFavorite: boolean;
  category: string | null;
  viewCount: number;
  lastViewed: Date | null;
  tags: Array<{
    id: string;
    name: string;
    color: string | null;
  }>;
}

// Define a type for the selected fields in getCrawlJobs for better type safety
// Excludes potentially large fields like 'options' and 'failedUrls' for list views
export type CrawlJobSummary = Pick<
  // Added export
  CrawlJob,
  | 'id'
  | 'startUrl'
  | 'status'
  | 'createdAt'
  | 'startTime'
  | 'endTime'
  | 'processedUrls'
  | 'foundUrls'
>;

// Define a type for the tag output
export type TagOutput = Pick<Tag, 'id' | 'name' | 'color'>; // Added export

export class DashboardService {
  /**
   * Get recent scrapes for a user with pagination.
   *
   * @param userId - The ID of the user.
   * @param pagination - Pagination options (page, limit).
   * @returns Object containing scrapes and total count.
   */
  static async getRecentScrapes(
    userId: string,
    pagination: PaginationOptions,
  ): Promise<{ scrapes: RecentScrapeOutput[]; total: number }> {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    try {
      const [scrapes, total] = await prisma.$transaction([
        // Use $transaction for consistency, though Promise.all is also fine here
        prisma.scrapedPage.findMany({
          where: {
            userId: userId,
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: limit,
          skip: skip,
          select: {
            // Selection matches RecentScrapeOutput interface
            id: true,
            url: true,
            title: true,
            createdAt: true,
            isFavorite: true,
            category: true,
            viewCount: true,
            lastViewed: true,
            tags: {
              select: {
                id: true,
                name: true,
                color: true,
              },
            },
          },
        }),
        prisma.scrapedPage.count({
          where: {
            userId: userId,
          },
        }),
      ]);

      // Type assertion is safe because 'select' matches the interface exactly.
      return { scrapes: scrapes as RecentScrapeOutput[], total };
    } catch (error) {
      logger.error({
        message: 'Error getting recent scrapes from service',
        userId: userId,
        page,
        limit,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // Consistently throw errors from service methods to allow controllers to handle responses
      throw new Error('Failed to retrieve recent scrapes.');
    }
  }

  /**
   * Get all scrapes for a user with filtering and pagination.
   *
   * @param userId - The ID of the user.
   * @param pagination - Pagination options (page, limit).
   * @param filters - Filtering options (search, category, tag ID).
   * @returns Object containing scrapes and total count.
   */
  static async getAllScrapes(
    userId: string,
    pagination: PaginationOptions,
    filters: { search?: string; category?: string; tag?: string },
  ): Promise<{ scrapes: RecentScrapeOutput[]; total: number }> {
    const { page, limit } = pagination;
    const { search, category, tag } = filters;
    const skip = (page - 1) * limit;

    // Use Prisma's generated type for the where clause for better type safety
    const where: Prisma.ScrapedPageWhereInput = {
      userId: userId,
    };

    if (search) {
      // Note: mode: 'insensitive' is not supported by SQLite with Prisma. Search is case-sensitive.
      where.OR = [{ url: { contains: search } }, { title: { contains: search } }];
    }
    if (category) {
      where.category = category; // Assuming 'category' is a direct string field
    }
    if (tag) {
      // Filter by tag ID using relation 'some'
      where.tags = {
        some: {
          id: tag,
        },
      };
    }

    try {
      const [scrapes, total] = await prisma.$transaction([
        prisma.scrapedPage.findMany({
          where,
          orderBy: {
            createdAt: 'desc',
          },
          take: limit,
          skip: skip,
          select: {
            // Selection matches RecentScrapeOutput interface
            id: true,
            url: true,
            title: true,
            createdAt: true,
            isFavorite: true,
            category: true,
            viewCount: true,
            lastViewed: true,
            tags: {
              select: {
                id: true,
                name: true,
                color: true,
              },
            },
          },
        }),
        prisma.scrapedPage.count({ where }),
      ]);

      // Type assertion is safe because 'select' matches the interface exactly.
      return { scrapes: scrapes as RecentScrapeOutput[], total };
    } catch (error) {
      logger.error({
        message: 'Error getting all scrapes from service',
        userId: userId,
        page,
        limit,
        filters,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new Error('Failed to retrieve scrapes.');
    }
  }

  /**
   * Get dashboard statistics for a user within a date range.
   * NOTE: Grouping by day and domain is done in JS for DB compatibility.
   * For very large datasets, DB-specific raw queries might be more performant.
   *
   * @param userId - The ID of the user.
   * @param dateRange - Start and end dates for the statistics.
   * @returns Object containing various statistics.
   */
  static async getStatistics(
    userId: string,
    dateRange: { start: Date; end: Date },
  ): Promise<{
    totalScrapes: number;
    totalFavorites: number;
    scrapesByDay: Array<{ date: string; count: number }>;
    topDomains: Array<{ domain: string; count: number }>;
    scrapeJobStats: { pending: number; failed: number };
    crawlJobStats: { pending: number; failed: number };
  }> {
    const { start, end } = dateRange;
    // Define the common date range filter
    const dateFilter = { gte: start, lte: end };

    try {
      // Use Promise.all for concurrent independent queries
      const [
        totalScrapes,
        totalFavorites,
        rawScrapeJobStats, // Renamed for clarity before processing
        rawCrawlJobStats, // Renamed for clarity before processing
        // Fetch pages for JS processing (by day and domain)
        pagesForProcessing,
      ] = await Promise.all([
        // Total scrapes (within date range)
        prisma.scrapedPage.count({
          where: { userId: userId, createdAt: dateFilter },
        }),
        // Total favorites (within date range)
        prisma.scrapedPage.count({
          where: { userId: userId, isFavorite: true, createdAt: dateFilter },
        }),
        // Scrape Job Stats (pending/failed)
        prisma.scrapeJob.groupBy({
          by: ['status'],
          where: {
            userId: userId,
            status: { in: ['pending', 'failed'] }, // Use Prisma.JobStatus enum if defined
            createdAt: dateFilter,
          },
          _count: { status: true },
        }),
        // Crawl Job Stats (pending/failed)
        prisma.crawlJob.groupBy({
          by: ['status'],
          where: {
            userId: userId,
            status: { in: ['pending', 'failed'] }, // Use Prisma.JobStatus enum if defined
            createdAt: dateFilter,
          },
          _count: { status: true },
        }),
        // Fetch pages needed for JS-based aggregations (by day, by domain)
        prisma.scrapedPage.findMany({
          where: {
            userId: userId,
            createdAt: dateFilter,
          },
          select: { createdAt: true, url: true }, // Select only necessary fields
          orderBy: { createdAt: 'asc' }, // Ordering helps for date processing if needed
        }),
      ]);

      // Process scrapes by day (JS approach for DB compatibility)
      const dayMap = new Map<string, number>();
      pagesForProcessing.forEach((page: { createdAt: Date; url: string }) => {
        // Add type annotation for 'page'
        const dateStr = page.createdAt.toISOString().split('T')[0]; // YYYY-MM-DD
        dayMap.set(dateStr, (dayMap.get(dateStr) || 0) + 1);
      });
      const scrapesByDay = Array.from(dayMap.entries()).map(([date, count]) => ({
        date,
        count, // count is already a number
      }));

      // Process top domains (JS approach)
      const domainMap = new Map<string, number>();
      pagesForProcessing.forEach((page: { createdAt: Date; url: string }) => {
        // Add type annotation for 'page'
        try {
          // Use URL object to reliably extract hostname
          const domain = new URL(page.url).hostname;
          domainMap.set(domain, (domainMap.get(domain) || 0) + 1);
        } catch (e) {
          logger.warn(`Invalid URL encountered processing top domains: ${page.url}`);
          // Skip invalid URLs
        }
      });
      const topDomains = Array.from(domainMap.entries())
        .map(([domain, count]) => ({ domain, count }))
        .sort((a, b) => b.count - a.count) // Sort descending by count
        .slice(0, 5); // Limit to top 5

      // Define type for groupBy results for clarity
      type JobStatGroup = { status: string; _count: { status: number } };

      // Process job stats from groupBy results
      const scrapeJobStats = {
        pending:
          rawScrapeJobStats.find((s: JobStatGroup) => s.status === 'pending')?._count.status || 0, // Add type annotation for 's'
        failed:
          rawScrapeJobStats.find((s: JobStatGroup) => s.status === 'failed')?._count.status || 0, // Add type annotation for 's'
      };
      const crawlJobStats = {
        pending:
          rawCrawlJobStats.find((s: JobStatGroup) => s.status === 'pending')?._count.status || 0, // Add type annotation for 's'
        failed:
          rawCrawlJobStats.find((s: JobStatGroup) => s.status === 'failed')?._count.status || 0, // Add type annotation for 's'
      };

      // Log the processed data for debugging
      logger.debug({
        message: 'Dashboard Statistics Calculation Details',
        userId,
        startDateUsed: start.toISOString(),
        endDateUsed: end.toISOString(),
        calculatedTotalScrapes: totalScrapes,
        calculatedTotalFavorites: totalFavorites,
        calculatedScrapesByDay: scrapesByDay,
        calculatedTopDomains: topDomains,
        calculatedScrapeJobStats: scrapeJobStats,
        calculatedCrawlJobStats: crawlJobStats,
      });

      return {
        totalScrapes,
        totalFavorites,
        scrapesByDay,
        topDomains,
        scrapeJobStats,
        crawlJobStats,
      };
    } catch (error) {
      logger.error({
        message: 'Error getting dashboard statistics from service',
        userId: userId,
        startDate: start.toISOString(), // Log ISO string for consistency
        endDate: end.toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new Error('Failed to retrieve dashboard statistics.');
    }
  }

  /**
   * Get all tags, ordered by name.
   *
   * @returns Array of tags.
   */
  static async getTags(): Promise<TagOutput[]> {
    try {
      const tags = await prisma.tag.findMany({
        orderBy: {
          name: 'asc',
        },
        select: {
          // Explicitly select fields
          id: true,
          name: true,
          color: true,
        },
      });
      return tags;
    } catch (error) {
      logger.error({
        message: 'Error getting tags from service',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new Error('Failed to retrieve tags.');
    }
  }

  /**
   * Get scrape jobs for a user with filtering and pagination.
   *
   * @param userId - The ID of the user.
   * @param pagination - Pagination options (page, limit).
   * @param filters - Filtering options (status).
   * @returns Object containing jobs and total count.
   */
  static async getScrapeJobs(
    userId: string,
    pagination: PaginationOptions,
    filters: { status?: string }, // Consider using Prisma.JobStatus enum if defined
  ): Promise<{ jobs: ScrapeJob[]; total: number }> {
    // Use the Prisma generated ScrapeJob type
    const { page, limit } = pagination;
    const { status } = filters;
    const skip = (page - 1) * limit;

    // Use Prisma's generated type for the where clause
    const where: Prisma.ScrapeJobWhereInput = {
      userId: userId,
    };

    if (status) {
      // TODO: Add validation if status comes directly from user input
      // e.g., if (!Object.values(Prisma.JobStatus).includes(status as Prisma.JobStatus)) { ... }
      where.status = status; // Assuming status is a valid status string/enum value
    }

    try {
      const [jobs, total] = await prisma.$transaction([
        prisma.scrapeJob.findMany({
          where,
          orderBy: {
            createdAt: 'desc',
          },
          take: limit,
          skip: skip,
          // Select all fields by default, or use 'select' if only a subset is needed
        }),
        prisma.scrapeJob.count({ where }),
      ]);

      return { jobs, total };
    } catch (error) {
      logger.error({
        message: 'Error getting scrape jobs from service',
        userId: userId,
        page,
        limit,
        filters,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new Error('Failed to retrieve scrape jobs.');
    }
  }

  /**
   * Mark a failed scrape job for retry.
   *
   * @param jobId - The ID of the job to retry.
   * @param userId - The ID of the user requesting the retry (for ownership check).
   * @returns Object indicating success or failure, and a message.
   */
  static async retryScrapeJob(
    jobId: string,
    userId: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const job = await prisma.scrapeJob.findUnique({
        where: { id: jobId },
      });

      // 1. Check if job exists and belongs to the user
      if (!job) {
        logger.warn({ message: `Retry attempt failed: Job ${jobId} not found.`, userId });
        return { success: false, message: 'Job not found.' };
      }
      if (job.userId !== userId) {
        logger.warn({
          message: `Retry attempt failed: Job ${jobId} does not belong to user ${userId}.`,
        });
        return { success: false, message: 'Job not found or not owned by user.' };
      }

      // 2. Check if job is actually failed
      if (job.status !== 'failed') {
        // Assuming 'failed' is the correct status string/enum value
        logger.warn({
          message: `Retry attempt failed: Job ${jobId} is not in 'failed' status (status: ${job.status}).`,
          userId,
        });
        return {
          success: false,
          message: `Only failed jobs can be retried. Current status: ${job.status}.`,
        };
      }

      // 3. Update job status to pending and reset fields
      await prisma.scrapeJob.update({
        where: { id: jobId },
        data: {
          status: 'pending', // Assuming 'pending' is the correct status string/enum value
          startTime: null,
          endTime: null,
          error: null,
          // Consider resetting retry count here if applicable
        },
      });

      logger.info({ message: `Job ${jobId} marked for retry by user ${userId}` });
      return { success: true, message: 'Job marked for retry.' };
    } catch (error) {
      logger.error({
        message: `Error marking job ${jobId} for retry`,
        jobId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return { success: false, message: 'An internal error occurred while retrying the job.' };
    }
  }

  /**
   * Delete a scrape job.
   *
   * @param jobId - The ID of the job to delete.
   * @param userId - The ID of the user requesting the deletion (for ownership check).
   * @returns Object indicating success or failure, and a message.
   */
  static async deleteScrapeJob(
    jobId: string,
    userId: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Use deleteMany with checks for ID and userId for atomicity and ownership verification
      // This avoids a separate findUnique call.
      const deleteResult = await prisma.scrapeJob.deleteMany({
        where: {
          id: jobId,
          userId: userId, // Ensure the job belongs to the user
        },
      });

      // Check if any record was actually deleted
      if (deleteResult.count === 0) {
        // Could be because the job didn't exist OR it didn't belong to the user
        // We might check if the job ID exists at all for a more specific message, but this is simpler.
        logger.warn({
          message: `Delete attempt failed: Job ${jobId} not found or not owned by user ${userId}.`,
        });
        return { success: false, message: 'Job not found or not owned by user.' };
      }

      logger.info({ message: `Job ${jobId} deleted successfully by user ${userId}` });
      return { success: true, message: 'Job deleted successfully.' };
    } catch (error) {
      // deleteMany shouldn't throw P2025 (RecordNotFound) like delete does,
      // but handle other potential errors.
      logger.error({
        message: `Error deleting job ${jobId}`,
        jobId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return { success: false, message: 'An internal error occurred while deleting the job.' };
    }
  }

  /**
   * Get crawl jobs for a user with pagination and filtering.
   *
   * @param userId - The ID of the user.
   * @param pagination - Pagination options (page, limit).
   * @param filters - Filtering options (status).
   * @returns Object containing jobs and total count.
   */
  static async getCrawlJobs(
    userId: string,
    pagination: PaginationOptions,
    filters: { status?: string }, // Consider using Prisma.JobStatus enum if defined
  ): Promise<{ jobs: CrawlJobSummary[]; total: number }> {
    // Use the defined CrawlJobSummary type
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    // Use Prisma's generated type for the where clause
    const where: Prisma.CrawlJobWhereInput = {
      userId: userId,
    };

    if (filters.status) {
      // TODO: Add validation if status comes directly from user input
      where.status = filters.status; // Assuming status is a valid status string/enum value
    }

    try {
      const [jobs, total] = await prisma.$transaction([
        prisma.crawlJob.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
          select: {
            // Select specific fields defined in CrawlJobSummary
            id: true,
            startUrl: true,
            status: true,
            createdAt: true,
            startTime: true,
            endTime: true,
            processedUrls: true,
            foundUrls: true,
            // Exclude 'options', 'failedUrls', etc. for list view performance
          },
        }),
        prisma.crawlJob.count({ where }),
      ]);

      // The result 'jobs' now implicitly matches CrawlJobSummary[] due to the 'select'
      return { jobs, total };
    } catch (error) {
      logger.error({
        message: 'Error getting crawl jobs in service',
        userId,
        pagination,
        filters,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // Throw error consistently
      throw new Error('Failed to retrieve crawl jobs.');
      // Previous behavior: return { jobs: [], total: 0 };
    }
  }

  /**
   * Get recent jobs (scrape, crawl, forum) for a user, merged and sorted by createdAt descending.
   * @param userId - The ID of the user.
   * @param limit - Max number of jobs to return (total, not per type)
   * @returns Array of recent jobs (mixed types)
   */
  static async getRecentJobs(userId: string, limit: number) {
    // Fetch recent scrape jobs
    const scrapeJobs = await prisma.scrapeJob.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        createdAt: true,
        status: true,
        url: true,
      },
    });
    // Fetch recent crawl jobs
    const crawlJobs = await prisma.crawlJob.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        createdAt: true,
        status: true,
        startUrl: true,
      },
    });
    // Map all jobs to a common shape
    const jobs = [
      ...scrapeJobs.map(j => ({
        id: j.id,
        createdAt: j.createdAt,
        status: j.status,
        url: j.url,
        title: null, // ScrapeJob has no title
        type: 'scrape',
      })),
      ...crawlJobs.map(j => ({
        id: j.id,
        createdAt: j.createdAt,
        status: j.status,
        url: j.startUrl,
        title: null, // CrawlJob has no title in schema
        type: 'crawl',
      })),
    ];
    // Sort by createdAt descending and return the top N
    jobs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return jobs.slice(0, limit);
  }

  // TODO: Add methods for managing tags (create, update, delete), categories, etc. if needed
}
