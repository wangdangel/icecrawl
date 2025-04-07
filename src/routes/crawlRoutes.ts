import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../db/prismaClient';
import logger from '../utils/logger';
import { authenticate } from '../middleware/authMiddleware'; // Assuming JWT/Session auth needed

const router = Router();

// Validation schema for starting a crawl job
const startCrawlSchema = z.object({
  startUrl: z.string().url({ message: "Invalid starting URL" }),
  maxDepth: z.number().int().min(0).nullable().optional(), // 0 = start page only, null/undefined = unlimited
  domainScope: z.enum(["strict", "parent", "subdomains", "parent_subdomains", "none"]).optional().default("strict"),
  useBrowser: z.boolean().optional().default(false),
  // Add other options if needed (e.g., specific cache/timeout/retry for the crawl)
  useCache: z.boolean().optional(),
  timeout: z.number().int().positive().optional(),
});

// Validation schema for getting crawl results
const getCrawlResultSchema = z.object({
  format: z.enum(["json", "markdown", "both"]).optional().default("json"),
});

/**
 * @swagger
 * /api/crawl:
 *   post:
 *     summary: Start a new website crawl job
 *     description: Initiates an asynchronous job to crawl a website starting from a given URL, extract content, and convert it to Markdown.
 *     tags: [Crawling]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - startUrl
 *             properties:
 *               startUrl:
 *                 type: string
 *                 format: uri
 *                 description: The initial URL to start crawling from.
 *               maxDepth:
 *                 type: integer
 *                 minimum: 0
 *                 nullable: true
 *                 description: Maximum link depth to crawl (0 for start page only, null/omitted for unlimited).
 *               domainScope:
 *                 type: string
 *                 enum: [strict, parent, subdomains, parent_subdomains, none]
 *                 default: strict
 *                 description: Controls which domains the crawler is allowed to visit.
 *               useBrowser:
 *                 type: boolean
 *                 default: false
 *                 description: Whether to use a headless browser for scraping (handles JavaScript).
 *               useCache:
 *                 type: boolean
 *                 description: Override default cache behavior for pages in this crawl.
 *               timeout:
 *                  type: integer
 *                  description: Override default request timeout for pages in this crawl.
 *     responses:
 *       201:
 *         description: Crawl job submitted successfully.
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
 *                   example: Crawl job submitted successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     jobId:
 *                       type: string
 *                       format: uuid
 *       400:
 *         description: Invalid input parameters.
 *       401:
 *         description: Authentication required.
 *       500:
 *         description: Server error submitting the job.
 */
router.post('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsedInput = startCrawlSchema.safeParse(req.body);
    if (!parsedInput.success) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid input data',
        details: parsedInput.error.format(),
      });
    }

    if (!req.user) {
      // Should be caught by authenticate middleware, but double-check
      return res.status(401).json({ status: 'error', message: 'User not authenticated' });
    }

    const { startUrl, ...options } = parsedInput.data;

    // Create CrawlJob record
    const newJob = await prisma.crawlJob.create({
      data: {
        startUrl: startUrl,
        userId: req.user.id,
        status: 'pending',
        options: JSON.stringify(options), // Store all options as JSON
        failedUrls: '[]', // Initialize as empty JSON array string
      },
    });

    logger.info({ message: 'Crawl job created', jobId: newJob.id, userId: req.user.id, startUrl: startUrl });

    return res.status(201).json({
      status: 'success',
      message: 'Crawl job submitted successfully',
      data: {
        jobId: newJob.id,
      },
    });

  } catch (error) {
    logger.error({
      message: 'Error creating crawl job',
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: req.user?.id,
      startUrl: req.body?.startUrl
    });
    next(error);
  }
});

/**
 * @swagger
 * /api/crawl/{jobId}:
 *   get:
 *     summary: Get crawl job status and results
 *     description: Retrieves the status of a crawl job and the results (scraped pages with Markdown) once completed.
 *     tags: [Crawling]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The ID of the crawl job.
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [json, markdown, both]
 *           default: json
 *         description: The desired format for the results. 'json' returns structured data including markdown, 'markdown' returns only URL -> markdown mapping, 'both' returns everything separately.
 *     responses:
 *       200:
 *         description: Crawl job status and results.
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
 *                     jobStatus:
 *                       type: string
 *                       example: completed
 *                     startTime:
 *                       type: string
 *                       format: date-time
 *                     endTime:
 *                       type: string
 *                       format: date-time
 *                     processedUrls:
 *                        type: integer
 *                     foundUrls:
 *                        type: integer
 *                     failedUrls:
 *                        type: array
 *                        items:
 *                          type: string
 *                     results:
 *                       type: object
 *                       description: Contains the results based on the requested format.
 *                       additionalProperties:
 *                         # Schema depends on the 'format' query param
 *                         oneOf:
 *                           - $ref: '#/components/schemas/ScrapedPageData' # For format=json/both
 *                           - type: string # For format=markdown
 *       401:
 *         description: Authentication required.
 *       403:
 *         description: User does not own this job.
 *       404:
 *         description: Crawl job not found.
 *       500:
 *         description: Server error retrieving the job.
 */
router.get('/:jobId', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const jobId = req.params.jobId;
    const userId = req.user!.id; // Assumes authenticate middleware populates req.user

    // Validate query params
    const parsedQuery = getCrawlResultSchema.safeParse(req.query);
     if (!parsedQuery.success) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid query parameters',
        details: parsedQuery.error.format(),
      });
    }
    const { format } = parsedQuery.data;


    // Fetch the crawl job
    const job = await prisma.crawlJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      return res.status(404).json({ status: 'error', message: 'Crawl job not found' });
    }

    // Optional: Check ownership (if jobs are user-specific)
    if (job.userId && job.userId !== userId) {
       // Allow admins to view any job? Or strict ownership? Assuming strict for now.
       // const isAdmin = req.user!.role === 'admin';
       // if (!isAdmin) {
          return res.status(403).json({ status: 'error', message: 'Forbidden: You do not own this job' });
       // }
    }

    let results: Record<string, any> | null = null;

    // If job is completed, fetch results
    if (job.status === 'completed' || job.status === 'completed_with_errors') {
      // Find all ScrapedPage records associated with this crawl
      // NOTE: This assumes ScrapedPage is updated by the crawler.
      // A more robust way might be to link ScrapedPage directly to CrawlJob
      // or query based on URLs found during the crawl (if stored).
      // For now, we query all pages potentially touched by the crawl (less precise).
      // A better approach would be needed for large scale.
      // Let's assume for now we just return the job status and failed URLs.
      // Fetching all results might be too large/slow.
      // We will return an empty results object for now.
      // TODO: Implement a more scalable way to retrieve results, possibly paginated
      // or linked directly via relation.

      results = {}; // Placeholder

      // Example: Fetching associated ScrapedPages (Needs refinement)
      /*
      const scrapedPages = await prisma.scrapedPage.findMany({
         where: {
           // How to link? Maybe store scraped page IDs in CrawlJob?
           // Or query by URL list if stored?
           // For now, this part is complex to implement efficiently without schema changes.
         }
      });

      results = {};
      scrapedPages.forEach(page => {
        const pageData: any = {
           title: page.title,
           metadata: JSON.parse(page.metadata || '{}'),
           scrapedAt: page.updatedAt, // or createdAt?
        };
        if (format === 'json' || format === 'both') {
           pageData.markdown = page.markdownContent;
        }
        if (format === 'markdown') {
           results![page.url] = page.markdownContent || '';
        } else {
           results![page.url] = pageData;
        }
      });
      */

    }

    // Parse failed URLs
    let failedUrlsList: string[] = [];
    try {
      if (job.failedUrls) {
        failedUrlsList = JSON.parse(job.failedUrls);
      }
    } catch (e) {
      logger.warn({ message: 'Failed to parse failedUrls for job result', jobId: job.id, error: e });
    }


    return res.status(200).json({
      status: 'success',
      data: {
        jobId: job.id,
        startUrl: job.startUrl,
        jobStatus: job.status,
        startTime: job.startTime,
        endTime: job.endTime,
        processedUrls: job.processedUrls,
        foundUrls: job.foundUrls,
        failedUrls: failedUrlsList,
        options: JSON.parse(job.options || '{}'),
        results: results, // Placeholder for actual results
      },
    });

  } catch (error) {
     logger.error({
      message: 'Error getting crawl job status/results',
      jobId: req.params.jobId,
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: req.user?.id
    });
    next(error);
  }
});

// Placeholder for ScrapedPageData schema definition if needed for Swagger
/**
 * @swagger
 * components:
 *   schemas:
 *     ScrapedPageData:
 *       type: object
 *       properties:
 *         title:
 *           type: string
 *         markdown:
 *           type: string
 *         metadata:
 *           type: object
 *         scrapedAt:
 *           type: string
 *           format: date-time
 */


export default router;
