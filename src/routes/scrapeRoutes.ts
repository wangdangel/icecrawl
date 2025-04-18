import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
// Remove local PrismaClient import and import shared instance
import prisma from '../db/prismaClient';
import { scrapeUrl } from '../core/scraper'; // Keep for potential direct scraping later? Or remove if only jobs are used.
import { scrapingRateLimiter } from '../middleware/rateLimiter';
import logger from '../utils/logger'; // Import logger

const router = Router();
// Remove local prisma instantiation

// Input validation schemas
const urlQuerySchema = z.object({
  url: z.string().url(),
});

// Updated schema to include optional fields from the dashboard form
const scrapeJobSchema = z.object({
  url: z.string().url(),
  category: z.string().optional(),
  notes: z.string().optional(),
  useBrowser: z.boolean().optional().default(false), // Add useBrowser
  useCookies: z.boolean().optional().default(false), // Add useCookies
  browserType: z.enum(['desktop', 'mobile']).optional().default('desktop'), // Add browserType
  // Add other potential job options here if needed
});

/**
 * @swagger
 * /api/scrape:
 *   get:
 *     summary: Scrape content from a URL
 *     description: Retrieves and processes content from the provided URL.
 *     tags: [Scraping]
 *     parameters:
 *       - in: query
 *         name: url
 *         required: true
 *         schema:
 *           type: string
 *           format: uri
 *         description: The URL to scrape
 *     responses:
 *       200:
 *         description: Successfully retrieved and processed content
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
 *                     url:
 *                       type: string
 *                       example: https://example.com
 *                     title:
 *                       type: string
 *                       example: Example Domain
 *                     content:
 *                       type: string
 *                       example: This domain is for use in illustrative examples...
 *                     metadata:
 *                       type: object
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Invalid URL parameter
 *       429:
 *         description: Too many requests - rate limit exceeded
 *       500:
 *         description: Server error while processing the request
 */
router.get('/', scrapingRateLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validate input from query parameters
    const parsedInput = urlQuerySchema.safeParse(req.query);
    if (!parsedInput.success) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid URL parameter',
        details: parsedInput.error.format(),
      });
    }

    // Perform scraping
    const scrapedData = await scrapeUrl(parsedInput.data.url);

    return res.status(200).json({
      status: 'success',
      data: scrapedData,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/scrape:
 *   post:
 *     summary: Scrape content from a URL (via request body)
 *     description: Retrieves and processes content from the URL provided in the request body.
 *     tags: [Scraping]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               url:
 *                 type: string
 *                 format: uri
 *                 description: The URL to scrape
 *             required:
 *               - url
 *     responses:
 *       200:
 *         description: Successfully retrieved and processed content
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ScrapedDataResponse' # Reference the schema defined elsewhere or inline
 *       400:
 *         description: Invalid URL in request body
 *       429:
 *         description: Too many requests - rate limit exceeded
 *       500:
 *         description: Server error while processing the request
 */
router.post('/', scrapingRateLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validate input from request body using the new schema
    const parsedInput = scrapeJobSchema.safeParse(req.body);
    if (!parsedInput.success) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid input data',
        details: parsedInput.error.format(),
      });
    }

    // Ensure user is authenticated (middleware should handle this, but check req.user)
    if (!req.user) {
      return res.status(401).json({ status: 'error', message: 'User not authenticated' });
    }

    const { url, category, notes, useBrowser, browserType, useCookies } = parsedInput.data;

    // Create a ScrapeJob record in the database
    const newJob = await prisma.scrapeJob.create({
      data: {
        url: url,
        userId: req.user.id, // Associate job with the logged-in user
        status: 'pending', // Initial status
        // Store options as a JSON string
        options: JSON.stringify({
          category: category,
          notes: notes,
          useBrowser: useBrowser,
          useCookies: useCookies,
          browserType: browserType,
        }),
      },
    });

    logger.info({ message: 'Scrape job created', jobId: newJob.id, userId: req.user.id, url: url });

    // Return success response indicating job submission
    return res.status(201).json({
      // Use 201 Created status
      status: 'success',
      message: 'Scrape job submitted successfully',
      data: {
        jobId: newJob.id,
      },
    });
  } catch (error) {
    logger.error({
      message: 'Error creating scrape job',
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: req.user?.id,
      url: req.body?.url,
    });
    next(error); // Pass error to the global error handler
  }
});

// Define a shared schema for the response (optional but good practice)
/**
 * @swagger
 * components:
 *   schemas:
 *     ScrapedDataResponse:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           example: success
 *         data:
 *           type: object
 *           properties:
 *             url:
 *               type: string
 *               example: https://example.com
 *             title:
 *               type: string
 *               example: Example Domain
 *             content:
 *               type: string
 *               example: This domain is for use in illustrative examples...
 *             metadata:
 *               type: object
 *             timestamp:
 *               type: string
 *               format: date-time
 */

export default router;
