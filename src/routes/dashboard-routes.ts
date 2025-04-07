import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/authMiddleware';
import logger from '../utils/logger';
import path from 'path';
// import fs from 'fs'; // No longer needed

const router = Router();
const prisma = new PrismaClient();

// REMOVED: Serve dashboard UI (index.html) - This should be handled by express.static in index.ts
/*
router.get('/', (req: Request, res: Response) => {
  const indexPath = path.resolve(__dirname, '../../public/dashboard/index.html');

  // Check if the file exists
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Dashboard UI not found. Run `npm run build:dashboard` to build the dashboard.');
  }
});
*/

// API routes for dashboard data
// ==============================

// Validation schemas
const paginationSchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val) : 10),
});

const dateRangeSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

/**
 * @swagger
 * /api/dashboard/recent-scrapes:
 *   get:
 *     summary: Get recent scrapes
 *     description: Returns a list of recently scraped pages
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Items per page
 *     responses:
 *       200:
 *         description: List of recent scrapes
 *       401:
 *         description: Not authenticated
 */
router.get('/recent-scrapes', authenticate, async (req: Request, res: Response) => {
  try {
    // Validate pagination params
    const { page, limit } = paginationSchema.parse(req.query);
    
    // Get recent scrapes
    const [scrapes, total] = await Promise.all([
      prisma.scrapedPage.findMany({
        where: {
          userId: req.user!.id,
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
          userId: req.user!.id,
        },
      }),
    ]);
    
    // Calculate pagination info
    const totalPages = Math.ceil(total / limit);
    
    res.json({
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
      message: 'Error getting recent scrapes',
      userId: req.user?.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while getting recent scrapes',
    });
  }
});

/**
 * @swagger
 * /api/dashboard/scrapes:
 *   get:
 *     summary: Get all scrapes with pagination and filtering
 *     description: Returns a paginated list of scrapes, optionally filtered by search term, category, or tag.
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term to filter by URL or title
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Category to filter by
 *       - in: query
 *         name: tag
 *         schema:
 *           type: string # Assuming tag ID is passed as string
 *         description: Tag ID to filter by
 *     responses:
 *       200:
 *         description: A paginated list of scrapes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     scrapes:
 *                       type: array
 *                       items:
 *                         # Define scrape item structure here or reference a schema
 *                         type: object 
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 *                         hasNextPage:
 *                           type: boolean
 *                         hasPrevPage:
 *                           type: boolean
 *       401:
 *         description: Not authenticated
 *       500:
 *         description: Server error
 */
router.get('/scrapes', authenticate, async (req: Request, res: Response) => {
  try {
    // Validate pagination and filter params
    const querySchema = paginationSchema.extend({
      search: z.string().optional(),
      category: z.string().optional(),
      tag: z.string().optional(), // Assuming tag ID is passed
    });
    const { page, limit, search, category, tag } = querySchema.parse(req.query);

    // Build Prisma where clause
    const where: any = {
      userId: req.user!.id,
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
      // Assuming 'tag' query param is the tag ID
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
        select: { // Select necessary fields
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

    // Calculate pagination info
    const totalPages = Math.ceil(total / limit);

    res.json({
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
      message: 'Error getting scrapes',
      userId: req.user?.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while getting scrapes',
    });
  }
});


/**
 * @swagger
 * /api/dashboard/statistics:
 *   get:
 *     summary: Get dashboard statistics
 *     description: Returns statistics for the dashboard
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for statistics
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for statistics
 *     responses:
 *       200:
 *         description: Dashboard statistics
 *       401:
 *         description: Not authenticated
 */
router.get('/statistics', authenticate, async (req: Request, res: Response) => {
  try {
    // Validate date range
    const { startDate, endDate } = dateRangeSchema.parse(req.query);
    
    // Parse dates
    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(new Date().getDate() - 30));
    const end = endDate ? new Date(endDate) : new Date();
    
    // Get statistics
    const [totalScrapes, totalFavorites, scrapesByDay, topDomains] = await Promise.all([
      // Total scrapes
      prisma.scrapedPage.count({
        where: {
          userId: req.user!.id,
          createdAt: {
            gte: start,
            lte: end,
          },
        },
      }),
      
      // Total favorites
      prisma.scrapedPage.count({
        where: {
          userId: req.user!.id,
          isFavorite: true,
          createdAt: {
            gte: start,
            lte: end,
          },
        },
      }),
      
      // Scrapes by day
      prisma.$queryRaw`
        SELECT 
          date(createdAt) as date, 
          COUNT(*) as count 
        FROM ScrapedPage 
        WHERE 
          userId = ${req.user!.id} 
          AND createdAt >= ${start} 
          AND createdAt <= ${end} 
        GROUP BY date(createdAt) 
        ORDER BY date(createdAt)
      `,
      
      // Top domains
      prisma.$queryRaw`
        SELECT 
          substr(url, instr(url, '://') + 3, 
            case 
              when instr(substr(url, instr(url, '://') + 3), '/') = 0 
              then length(substr(url, instr(url, '://') + 3)) 
              else instr(substr(url, instr(url, '://') + 3), '/') - 1 
            end
          ) as domain, 
          COUNT(*) as count 
        FROM ScrapedPage 
        WHERE 
          userId = ${req.user!.id} 
          AND createdAt >= ${start} 
          AND createdAt <= ${end} 
        GROUP BY domain 
        ORDER BY count DESC 
        LIMIT 5
      `,
    ]);
    
    res.json({
      status: 'success',
      data: {
        totalScrapes,
        totalFavorites,
        scrapesByDay,
        topDomains,
        dateRange: {
          start,
          end,
        },
      },
    });
  } catch (error) {
    logger.error({
      message: 'Error getting dashboard statistics',
      userId: req.user?.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while getting dashboard statistics',
    });
  }
});

/**
 * @swagger
 * /api/dashboard/tags:
 *   get:
 *     summary: Get tags
 *     description: Returns a list of tags
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of tags
 *       401:
 *         description: Not authenticated
 */
router.get('/tags', authenticate, async (req: Request, res: Response) => {
  try {
    // Get all tags
    const tags = await prisma.tag.findMany({
      orderBy: {
        name: 'asc',
      },
    });
    
    res.json({
      status: 'success',
      data: {
        tags,
      },
    });
  } catch (error) {
    logger.error({
      message: 'Error getting tags',
      userId: req.user?.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while getting tags',
    });
  }
});

/**
 * @swagger
 * /api/dashboard/scrape-jobs:
 *   get:
 *     summary: Get scrape jobs
 *     description: Returns a list of scrape jobs
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Items per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, processing, completed, failed]
 *         description: Filter by status
 *     responses:
 *       200:
 *         description: List of scrape jobs
 *       401:
 *         description: Not authenticated
 */
router.get('/scrape-jobs', authenticate, async (req: Request, res: Response) => {
  try {
    // Validate pagination params
    const { page, limit } = paginationSchema.parse(req.query);
    
    // Build where clause
    const where: any = {
      userId: req.user!.id,
    };
    
    // Filter by status if provided
    if (req.query.status) {
      where.status = req.query.status;
    }
    
    // Get scrape jobs
    const [jobs, total] = await Promise.all([
      prisma.scrapeJob.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
        skip: (page - 1) * limit,
      }),
      prisma.scrapeJob.count({
        where,
      }),
    ]);
    
    // Calculate pagination info
    const totalPages = Math.ceil(total / limit);
    
    res.json({
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
      message: 'Error getting scrape jobs',
      userId: req.user?.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while getting scrape jobs',
    });
  }
});

/**
 * @swagger
 * /api/dashboard/scrape-job/{id}/retry:
 *   post:
 *     summary: Retry a failed scrape job
 *     description: Resets the status of a failed scrape job to 'pending' so it can be retried by the worker.
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The ID of the scrape job to retry
 *     responses:
 *       200:
 *         description: Job successfully marked for retry
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Job marked for retry.
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Job not found or not associated with the user
 *       400:
 *         description: Job is not in a failed state
 *       500:
 *         description: Server error
 */
router.post('/scrape-job/:id/retry', authenticate, async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;

  try {
    const job = await prisma.scrapeJob.findUnique({
      where: { id: id },
    });

    // Check if job exists and belongs to the user
    if (!job || job.userId !== userId) {
      return res.status(404).json({ status: 'error', message: 'Job not found.' });
    }

    // Check if job is actually failed
    if (job.status !== 'failed') {
      return res.status(400).json({ status: 'error', message: 'Only failed jobs can be retried.' });
    }

    // Update job status to pending
    await prisma.scrapeJob.update({
      where: { id: id },
      data: {
        status: 'pending',
        startTime: null, // Reset times and error
        endTime: null,
        error: null,
      },
    });

    logger.info({ message: `Job ${id} marked for retry`, userId });
    res.json({ status: 'success', message: 'Job marked for retry.' });

  } catch (error) {
    logger.error({ message: `Error retrying job ${id}`, userId, error: error instanceof Error ? error.message : 'Unknown error' });
    res.status(500).json({ status: 'error', message: 'An error occurred while retrying the job.' });
  }
});

/**
 * @swagger
 * /api/dashboard/scrape-job/{id}:
 *   delete:
 *     summary: Delete a scrape job
 *     description: Deletes a specific scrape job.
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The ID of the scrape job to delete
 *     responses:
 *       200:
 *         description: Job successfully deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Job deleted successfully.
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Job not found or not associated with the user
 *       500:
 *         description: Server error
 */
router.delete('/scrape-job/:id', authenticate, async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;

  try {
    // First, verify the job exists and belongs to the user
    const job = await prisma.scrapeJob.findUnique({
      where: { id: id },
      select: { userId: true } // Only select userId for verification
    });

    if (!job || job.userId !== userId) {
      return res.status(404).json({ status: 'error', message: 'Job not found.' });
    }

    // If verification passes, delete the job
    await prisma.scrapeJob.delete({
      where: { id: id },
    });

    logger.info({ message: `Job ${id} deleted`, userId });
    res.json({ status: 'success', message: 'Job deleted successfully.' });

  } catch (error) {
    // Handle potential errors, e.g., Prisma errors
     if (error instanceof Error && (error as any).code === 'P2025') { // Prisma code for record not found
        return res.status(404).json({ status: 'error', message: 'Job not found.' });
     }
    logger.error({ message: `Error deleting job ${id}`, userId, error: error instanceof Error ? error.message : 'Unknown error' });
    res.status(500).json({ status: 'error', message: 'An error occurred while deleting the job.' });
  }
});


// Export router
export default router;
