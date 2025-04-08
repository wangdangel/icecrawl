import { Router, Request, Response } from 'express'; // Added Request, Response back
import { z } from 'zod';
// Remove local PrismaClient import
import prisma from '../db/prismaClient'; // Import shared instance
import { authenticate } from '../middleware/authMiddleware';
import logger from '../utils/logger';
// path import not needed currently
import { DashboardController } from '../controllers/dashboardController'; // Import controller

const router = Router();
// Remove local prisma instantiation

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
// Removed paginationSchema - moved to controller
// Removed dateRangeSchema - moved to controller

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
router.get('/recent-scrapes', authenticate, DashboardController.getRecentScrapes); // Use controller method

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
router.get('/scrapes', authenticate, DashboardController.getAllScrapes); // Use controller method


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
router.get('/statistics', authenticate, DashboardController.getStatistics); // Use controller method

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
router.get('/tags', authenticate, DashboardController.getTags); // Use controller method

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
router.get('/scrape-jobs', authenticate, DashboardController.getScrapeJobs); // Use controller method

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
router.post('/scrape-job/:id/retry', authenticate, DashboardController.retryScrapeJob); // Use controller method

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
router.delete('/scrape-job/:id', authenticate, DashboardController.deleteScrapeJob); // Use controller method

router.delete('/scrape/:id', authenticate, DashboardController.deleteScrape); // New: delete a scraped page

/**
 * @swagger
 * /api/dashboard/crawl-jobs:
 *   get:
 *     summary: Get crawl jobs
 *     description: Returns a list of crawl jobs with pagination and status filtering.
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
 *           enum: [pending, processing, completed, completed_with_errors, failed]
 *         description: Filter by status
 *     responses:
 *       200:
 *         description: List of crawl jobs
 *       401:
 *         description: Not authenticated
 */
router.get('/crawl-jobs', authenticate, DashboardController.getCrawlJobs); // Use new controller method

// TODO: Add endpoints for deleting/retrying crawl jobs if needed

// Export router
export default router;
