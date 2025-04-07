import { Prisma } from '@prisma/client'; // Import Prisma namespace
import prisma from '../db/prismaClient'; // Import shared instance
import logger from '../utils/logger';

// Remove local prisma instantiation

// Define interfaces for data structures if needed, or import from shared types
interface PaginationOptions {
  page: number;
  limit: number;
}

interface RecentScrape {
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
    pagination: PaginationOptions
  ): Promise<{ scrapes: RecentScrape[]; total: number }> {
    const { page, limit } = pagination;
    try {
      const [scrapes, total] = await Promise.all([
        prisma.scrapedPage.findMany({
          where: {
            userId: userId,
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: limit,
          skip: (page - 1) * limit,
          select: {
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

      // Ensure the return type matches the promise annotation
      return { scrapes: scrapes as RecentScrape[], total };

    } catch (error) {
      logger.error({
        message: 'Error getting recent scrapes from service',
        userId: userId,
        page,
        limit,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // Re-throw or return empty state
      throw new Error('Failed to retrieve recent scrapes.');
      // Or return { scrapes: [], total: 0 };
    }
  }

  /**
   * Get all scrapes for a user with filtering and pagination.
   *
   * @param userId - The ID of the user.
   * @param pagination - Pagination options (page, limit).
   * @param filters - Filtering options (search, category, tag).
   * @returns Object containing scrapes and total count.
   */
  static async getAllScrapes(
    userId: string,
    pagination: PaginationOptions,
    filters: { search?: string; category?: string; tag?: string }
  ): Promise<{ scrapes: RecentScrape[]; total: number }> { // Reuse RecentScrape interface for now
    const { page, limit } = pagination;
    const { search, category, tag } = filters;

    try {
      // Build Prisma where clause
      const where: any = {
        userId: userId,
      };
      if (search) {
        where.OR = [
          { url: { contains: search, mode: 'insensitive' } },
          { title: { contains: search, mode: 'insensitive' } },
        ];
      }
      if (category) {
        where.category = category;
      }
      if (tag) {
        // Assuming 'tag' filter is the tag ID
        where.tags = {
          some: {
            id: tag,
          },
        };
      }

      // Get scrapes and total count
      const [scrapes, total] = await Promise.all([
        prisma.scrapedPage.findMany({
          where,
          orderBy: {
            createdAt: 'desc',
          },
          take: limit,
          skip: (page - 1) * limit,
          select: { // Select necessary fields, matching RecentScrape structure
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

      return { scrapes: scrapes as RecentScrape[], total };

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
   *
   * @param userId - The ID of the user.
   * @param dateRange - Start and end dates for the statistics.
   * @returns Object containing various statistics.
   */
  static async getStatistics(
    userId: string,
    dateRange: { start: Date; end: Date }
  ): Promise<{
    totalScrapes: number;
    totalFavorites: number;
    scrapesByDay: any; // Type based on raw query result
    topDomains: any;   // Type based on raw query result
  }> {
    const { start, end } = dateRange;
    try {
      const [totalScrapes, totalFavorites, scrapesByDay, topDomains] = await Promise.all([
        // Total scrapes
        prisma.scrapedPage.count({
          where: {
            userId: userId,
            createdAt: { gte: start, lte: end },
          },
        }),

        // Total favorites
        prisma.scrapedPage.count({
          where: {
            userId: userId,
            isFavorite: true,
            createdAt: { gte: start, lte: end },
          },
        }),

        // Scrapes by day (using raw query)
        prisma.$queryRaw`
          SELECT
            strftime('%Y-%m-%d', createdAt) as date, -- Use strftime for SQLite date formatting
            CAST(COUNT(*) AS INTEGER) as count -- Explicitly cast count to integer
          FROM ScrapedPage
          WHERE
            userId = ${userId}
            AND createdAt >= ${start}
            AND createdAt <= ${end}
          GROUP BY date
          ORDER BY date
        `,

        // Top domains (using raw query)
        prisma.$queryRaw`
          SELECT
            substr(url, instr(url, '://') + 3,
              case
                when instr(substr(url, instr(url, '://') + 3), '/') = 0
                then length(substr(url, instr(url, '://') + 3))
                else instr(substr(url, instr(url, '://') + 3), '/') - 1
              end
            ) as domain,
            CAST(COUNT(*) AS INTEGER) as count -- Explicitly cast count to integer
          FROM ScrapedPage
          WHERE
            userId = ${userId}
            AND createdAt >= ${start}
            AND createdAt <= ${end}
          GROUP BY domain
          ORDER BY count DESC
          LIMIT 5
        `,
      ]);

      return { totalScrapes, totalFavorites, scrapesByDay, topDomains };

    } catch (error) {
      logger.error({
        message: 'Error getting dashboard statistics from service',
        userId: userId,
        startDate: start,
        endDate: end,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new Error('Failed to retrieve dashboard statistics.');
    }
  }

  /**
   * Get all tags.
   *
   * @returns Array of tags.
   */
  static async getTags(): Promise<Array<{ id: string; name: string; color: string | null }>> {
    try {
      const tags = await prisma.tag.findMany({
        orderBy: {
          name: 'asc',
        },
        select: { // Explicitly select fields
            id: true,
            name: true,
            color: true,
        }
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
    filters: { status?: string }
  ): Promise<{ jobs: any[]; total: number }> { // Use 'any' for job type for now
    const { page, limit } = pagination;
    const { status } = filters;

    try {
      // Build where clause
      const where: any = {
        userId: userId,
      };
      if (status) {
        // Ensure status is one of the allowed enum values if using Prisma enum
        // Example: if (['pending', 'processing', 'completed', 'failed'].includes(status)) {
        where.status = status;
        // } else { logger.warn(`Invalid status filter: ${status}`); }
      }

      // Get scrape jobs and total count
      const [jobs, total] = await Promise.all([
        prisma.scrapeJob.findMany({
          where,
          orderBy: {
            createdAt: 'desc',
          },
          take: limit,
          skip: (page - 1) * limit,
          // Select specific fields if needed, or return the full object
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
  static async retryScrapeJob(jobId: string, userId: string): Promise<{ success: boolean; message: string }> {
    try {
      const job = await prisma.scrapeJob.findUnique({
        where: { id: jobId },
      });

      // Check if job exists and belongs to the user
      if (!job || job.userId !== userId) {
        return { success: false, message: 'Job not found or not owned by user.' };
      }

      // Check if job is actually failed
      if (job.status !== 'failed') {
        return { success: false, message: 'Only failed jobs can be retried.' };
      }

      // Update job status to pending
      await prisma.scrapeJob.update({
        where: { id: jobId },
        data: {
          status: 'pending',
          startTime: null, // Reset times and error
          endTime: null,
          error: null,
        },
      });

      logger.info({ message: `Job ${jobId} marked for retry by user ${userId}` });
      return { success: true, message: 'Job marked for retry.' };

    } catch (error) {
      logger.error({
        message: `Error marking job ${jobId} for retry`,
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
  static async deleteScrapeJob(jobId: string, userId: string): Promise<{ success: boolean; message: string }> {
    try {
      // First, verify the job exists and belongs to the user
      const job = await prisma.scrapeJob.findUnique({
        where: { id: jobId },
        select: { userId: true } // Only select userId for verification
      });

      if (!job || job.userId !== userId) {
        return { success: false, message: 'Job not found or not owned by user.' };
      }

      // If verification passes, delete the job
      await prisma.scrapeJob.delete({
        where: { id: jobId },
      });

      logger.info({ message: `Job ${jobId} deleted by user ${userId}` });
      return { success: true, message: 'Job deleted successfully.' };

    } catch (error) {
       // Handle potential errors, e.g., Prisma errors like record not found
       if (error instanceof Error && (error as any).code === 'P2025') {
           logger.warn({ message: `Attempted to delete non-existent job ${jobId}`, userId });
           return { success: false, message: 'Job not found.' };
       }
      logger.error({
        message: `Error deleting job ${jobId}`,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return { success: false, message: 'An internal error occurred while deleting the job.' };
    }
  }

  /**
   * Get crawl jobs for a user with pagination and filtering.
   */
  static async getCrawlJobs(
    userId: string,
    pagination: { page: number; limit: number },
    filters: { status?: string }
  ): Promise<{ jobs: any[]; total: number }> { // Use 'any' for now, or import CrawlJob type
    try {
      const { page, limit } = pagination;
      const skip = (page - 1) * limit;

      const where: any = { // Use 'any' type for the where clause
        userId: userId, // Filter by user
      };

      if (filters.status) {
        where.status = filters.status;
      }

      const [jobs, total] = await prisma.$transaction([
        prisma.crawlJob.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
          // Select specific fields if needed to optimize payload
          select: {
             id: true,
             startUrl: true,
             status: true,
             createdAt: true,
             startTime: true,
             endTime: true,
             processedUrls: true,
             foundUrls: true,
             // options: true, // Maybe exclude large options string from list view
             // failedUrls: true // Maybe exclude large failedUrls string from list view
          }
        }),
        prisma.crawlJob.count({ where }),
      ]);

      return { jobs, total };

    } catch (error) {
      logger.error({
        message: 'Error getting crawl jobs in service',
        userId,
        pagination,
        filters,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // Re-throw or return empty state? Returning empty for now.
      return { jobs: [], total: 0 };
    }
  }

  // TODO: Add methods for managing tags, categories, etc. if needed
}
