import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/authMiddleware';
import logger from '../utils/logger';
import path from 'path';
import fs from 'fs';

const router = Router();
const prisma = new PrismaClient();

// Serve dashboard UI (index.html)
router.get('/', (req: Request, res: Response) => {
  const indexPath = path.resolve(__dirname, '../../public/dashboard/index.html');
  
  // Check if the file exists
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Dashboard UI not found. Run `npm run build:dashboard` to build the dashboard.');
  }
});

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
router.get('/api/recent-scrapes', authenticate, async (req: Request, res: Response) => {
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
router.get('/api/statistics', authenticate, async (req: Request, res: Response) => {
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
router.get('/api/tags', authenticate, async (req: Request, res: Response) => {
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
router.get('/api/scrape-jobs', authenticate, async (req: Request, res: Response) => {
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

// Export router
export default router;
