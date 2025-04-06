import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { scrapeUrl } from '../core/scraper';
import { scrapingRateLimiter } from '../middleware/rateLimiter';

const router = Router();

// Input validation schema
const urlSchema = z.object({
  url: z.string().url(),
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
    const { url } = req.query;
    
    // Validate input
    const parsedInput = urlSchema.safeParse({ url });
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

export default router;
