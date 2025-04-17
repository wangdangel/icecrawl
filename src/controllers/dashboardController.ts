import { Request, Response } from 'express';
import { z } from 'zod';
import { DashboardService } from '../services/dashboardService';
import logger from '../utils/logger';
import prisma from '../db/prismaClient';

// Validation schema for pagination
const paginationSchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val, 10) : 1).pipe(z.number().int().positive().default(1)),
  limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 10).pipe(z.number().int().positive().max(100).default(10)), // Add max limit
});

// Validation schema for filtering scrapes
const scrapeFilterSchema = paginationSchema.extend({
  search: z.string().optional(),
  category: z.string().optional(),
  tag: z.string().optional(), // Assuming tag ID is passed
});

// Validation schema for date range
const dateRangeSchema = z.object({
  startDate: z.string().datetime({ offset: true }).optional(), // Expect ISO 8601 format
  endDate: z.string().datetime({ offset: true }).optional(),
});

// Validation schema for scrape job filters
const scrapeJobFilterSchema = paginationSchema.extend({
    status: z.enum(['pending', 'processing', 'completed', 'failed']).optional(),
});


export class DashboardController {
  /**
   * Get recent scrapes for the authenticated user.
   */
  static async getRecentScrapes(req: Request, res: Response): Promise<Response> {
    try {
      // Validate pagination params
      const validationResult = paginationSchema.safeParse(req.query);
      if (!validationResult.success) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid pagination parameters',
          details: validationResult.error.format(),
        });
      }
      const { page, limit } = validationResult.data;
      const userId = req.user!.id; // Assuming authenticate middleware populates req.user

      // Get recent scrapes from service
      const { scrapes, total } = await DashboardService.getRecentScrapes(userId, { page, limit });

      // Calculate pagination info
      const totalPages = Math.ceil(total / limit);

      return res.json({
        status: 'success',
        data: {
          scrapes,
          pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
          },
        },
      });
    } catch (error) {
      logger.error({
        message: 'Error getting recent scrapes in controller',
        userId: req.user?.id,
        query: req.query,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return res.status(500).json({
        status: 'error',
        message: 'An error occurred while getting recent scrapes',
      });
    }
  }

  /**
   * Get all scrapes for the authenticated user with filtering and pagination.
   */
  static async getAllScrapes(req: Request, res: Response): Promise<Response> {
    try {
      // Validate pagination and filter params
      const validationResult = scrapeFilterSchema.safeParse(req.query);
       if (!validationResult.success) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid query parameters',
          details: validationResult.error.format(),
        });
      }
      const { page, limit, search, category, tag } = validationResult.data;
      const userId = req.user!.id;

      // Get scrapes from service
      const { scrapes, total } = await DashboardService.getAllScrapes(
        userId,
        { page, limit },
        { search, category, tag }
      );

      // Calculate pagination info
      const totalPages = Math.ceil(total / limit);

      return res.json({
        status: 'success',
        data: {
          scrapes,
          pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
          },
        },
      });
    } catch (error) {
      logger.error({
        message: 'Error getting all scrapes in controller',
        userId: req.user?.id,
        query: req.query,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return res.status(500).json({
        status: 'error',
        message: 'An error occurred while getting scrapes',
      });
    }
  }

  /**
   * Get dashboard statistics for the authenticated user.
   */
  static async getStatistics(req: Request, res: Response): Promise<Response> {
    try {
      // Validate date range params
      const validationResult = dateRangeSchema.safeParse(req.query);
      if (!validationResult.success) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid date range parameters',
          details: validationResult.error.format(),
        });
      }
      const { startDate, endDate } = validationResult.data;
      const userId = req.user!.id;

      // Calculate date range, ensuring UTC boundaries
      let end: Date;
      if (endDate) {
        end = new Date(endDate);
        // Set to end of the selected day in UTC
        end.setUTCHours(23, 59, 59, 999);
      } else {
        end = new Date(); // Use current time as end (implicitly UTC via Prisma)
      }

      let start: Date;
      if (startDate) {
        start = new Date(startDate);
        // Set to start of the selected day in UTC
        start.setUTCHours(0, 0, 0, 0);
      } else {
        // Default to 30 days ago, start of that day in UTC
        start = new Date(end); // Start from end date
        start.setUTCDate(start.getUTCDate() - 30);
        start.setUTCHours(0, 0, 0, 0);
      }

      // Log the exact parameters being sent to the service (using INFO level)
      logger.info({
        message: '[INFO] Calling DashboardService.getStatistics with parameters', // Added [INFO] prefix for clarity
        userId,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      });

      // Get statistics from service using the calculated UTC-based range
      const stats = await DashboardService.getStatistics(userId, { start, end });

      // Set cache control headers to prevent caching
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache'); // For older HTTP/1.0 proxies
      res.setHeader('Expires', '0'); // Expire immediately

      return res.json({
        status: 'success',
        data: {
          ...stats,
          // Include the date range used in the response for clarity
          dateRange: {
            start: start.toISOString(),
            end: end.toISOString(),
          },
        },
      });
    } catch (error) {
      logger.error({
        message: 'Error getting dashboard statistics in controller',
        userId: req.user?.id,
        query: req.query,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return res.status(500).json({
        status: 'error',
        message: 'An error occurred while getting dashboard statistics',
      });
    }
  }

  /**
   * Get all available tags.
   */
  static async getTags(req: Request, res: Response): Promise<Response> {
    try {
      // No validation needed for this simple GET request

      // Get tags from service
      const tags = await DashboardService.getTags();

      return res.json({
        status: 'success',
        data: {
          tags,
        },
      });
    } catch (error) {
      logger.error({
        message: 'Error getting tags in controller',
        userId: req.user?.id, // User ID might be relevant for context, though not used in query
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return res.status(500).json({
        status: 'error',
        message: 'An error occurred while getting tags',
      });
    }
  }

  /**
   * Get scrape jobs for the authenticated user with filtering and pagination.
   */
  static async getScrapeJobs(req: Request, res: Response): Promise<Response> {
    try {
      // Validate pagination and filter params
      const validationResult = scrapeJobFilterSchema.safeParse(req.query);
      if (!validationResult.success) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid query parameters',
          details: validationResult.error.format(),
        });
      }
      const { page, limit, status } = validationResult.data;
      const userId = req.user!.id;

      // Get scrape jobs from service
      const { jobs, total } = await DashboardService.getScrapeJobs(
        userId,
        { page, limit },
        { status }
      );

      // Calculate pagination info
      const totalPages = Math.ceil(total / limit);

      return res.json({
        status: 'success',
        data: {
          jobs,
          pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
          },
        },
      });
    } catch (error) {
      logger.error({
        message: 'Error getting scrape jobs in controller',
        userId: req.user?.id,
        query: req.query,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return res.status(500).json({
        status: 'error',
        message: 'An error occurred while getting scrape jobs',
      });
    }
  }

  /**
   * Retry a failed scrape job.
   */
  static async retryScrapeJob(req: Request, res: Response): Promise<Response> {
    try {
      const { id: jobId } = req.params; // Extract jobId from route parameters
      const userId = req.user!.id;

      // No request body validation needed, just the jobId from the path

      // Call the service to retry the job
      const result = await DashboardService.retryScrapeJob(jobId, userId);

      if (!result.success) {
        // Determine appropriate status code based on the message
        const statusCode = result.message.includes('not found') ? 404 : 400;
        return res.status(statusCode).json({
          status: 'error',
          message: result.message,
        });
      }

      // Job successfully marked for retry
      return res.json({
        status: 'success',
        message: result.message,
      });

    } catch (error) {
      logger.error({
        message: 'Error retrying scrape job in controller',
        userId: req.user?.id,
        jobId: req.params.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return res.status(500).json({
        status: 'error',
        message: 'An error occurred while retrying the scrape job',
      });
    }
  }

  /**
   * Delete a specific scrape job.
   */
  static async deleteScrapeJob(req: Request, res: Response): Promise<Response> {
    try {
      const { id: jobId } = req.params;
      const userId = req.user!.id;

      // Call the service to delete the job
      const result = await DashboardService.deleteScrapeJob(jobId, userId);

      if (!result.success) {
        // Determine appropriate status code (likely 404 if not found)
        const statusCode = result.message.includes('not found') ? 404 : 500;
        return res.status(statusCode).json({
          status: 'error',
          message: result.message,
        });
      }

      // Job successfully deleted
      return res.json({
        status: 'success',
        message: result.message,
      });

    } catch (error) {
      // Catch potential errors not handled by the service layer's try/catch
      logger.error({
        message: 'Error deleting scrape job in controller',
        userId: req.user?.id,
        jobId: req.params.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return res.status(500).json({
        status: 'error',
        message: 'An unexpected error occurred while deleting the scrape job',
      });
    }
  }

  static async getCrawlJobs(req: Request, res: Response): Promise<Response> {
    try {
      // Validate pagination and filter query parameters
      const querySchema = z.object({
        page: z.coerce.number().int().min(1).optional().default(1),
        limit: z.coerce.number().int().min(1).max(100).optional().default(10),
        status: z.enum(["pending", "processing", "completed", "completed_with_errors", "failed"]).optional(),
      });

      const parsedQuery = querySchema.safeParse(req.query);
      if (!parsedQuery.success) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid query parameters',
          details: parsedQuery.error.format(),
        });
      }

      const { page, limit, status } = parsedQuery.data;
      const userId = req.user!.id; // Assumes authenticate middleware ran

      // Call service layer, passing pagination and filters as objects
      const { jobs, total } = await DashboardService.getCrawlJobs(userId, { page, limit }, { status });

      // Calculate pagination info
      const totalPages = Math.ceil(total / limit);

      return res.json({
        status: 'success',
        data: {
          jobs,
          pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
          },
        },
      });

    } catch (error) {
      logger.error({
        message: 'Error getting crawl jobs for dashboard',
        userId: req.user?.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return res.status(500).json({
        status: 'error',
        message: 'An error occurred while fetching crawl jobs',
      });
    }
  }

  /**
   * Get recent jobs (scrape, crawl, forum) for the authenticated user.
   */
  static async getRecentJobs(req: Request, res: Response): Promise<Response> {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 5;
      const userId = req.user!.id;
      // Call service to get unified recent jobs
      const jobs = await DashboardService.getRecentJobs(userId, limit);
      return res.json({
        status: 'success',
        data: { jobs },
      });
    } catch (error) {
      logger.error({
        message: 'Error getting recent jobs in controller',
        userId: req.user?.id,
        query: req.query,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return res.status(500).json({
        status: 'error',
        message: 'An error occurred while getting recent jobs',
      });
    }
  }

  // TODO: Add methods for managing tags, categories, etc. if needed

  static async deleteScrape(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!id) {
        return res.status(400).json({ status: 'error', message: 'Missing scrape ID' });
      }

      // Optional: check if the scrape belongs to the user
      const existing = await prisma.scrapedPage.findUnique({
        where: { id },
      });

      if (!existing) {
        return res.status(404).json({ status: 'error', message: 'Scrape not found' });
      }

      if (existing.userId && existing.userId !== userId) {
        return res.status(403).json({ status: 'error', message: 'Not authorized to delete this scrape' });
      }

      await prisma.scrapedPage.delete({
        where: { id },
      });

      return res.json({ status: 'success', message: 'Scrape deleted successfully' });
    } catch (error) {
      logger.error({
        message: 'Error deleting scrape',
        userId: req.user?.id,
        scrapeId: req.params.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return res.status(500).json({ status: 'error', message: 'Failed to delete scrape' });
    }
  }
}
