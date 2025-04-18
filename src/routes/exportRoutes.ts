import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { exporterManager } from '../exporters/exporterManager';
import { scrapeUrl } from '../core/scraper';
import logger from '../utils/logger';

const router = Router();

// Input validation schema
const exportUrlSchema = z.object({
  url: z.string().url(),
  format: z.string().default('json'),
  download: z.enum(['true', 'false']).default('false'),
});

/**
 * @swagger
 * /api/export:
 *   get:
 *     summary: Export scraped content in different formats
 *     description: Scrapes content from a URL and exports it in the specified format
 *     tags: [Export]
 *     parameters:
 *       - in: query
 *         name: url
 *         required: true
 *         schema:
 *           type: string
 *           format: uri
 *         description: The URL to scrape
 *       - in: query
 *         name: format
 *         required: false
 *         schema:
 *           type: string
 *           enum: [json, csv, xml, html, text, markdown]
 *         description: Export format (default is json)
 *       - in: query
 *         name: download
 *         required: false
 *         schema:
 *           type: string
 *           enum: [true, false]
 *         description: Whether to download the file (default is false)
 *     responses:
 *       200:
 *         description: Exported content
 *       400:
 *         description: Invalid parameters
 *       500:
 *         description: Server error
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validate input
    const parsedInput = exportUrlSchema.safeParse(req.query);
    if (!parsedInput.success) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid parameters',
        details: parsedInput.error.format(),
      });
    }

    const { url, format, download } = parsedInput.data;

    // Scrape the URL
    const scrapedData = await scrapeUrl(url);

    // Export the data
    const { data, contentType } = await exporterManager.export(format, scrapedData);

    // Set headers for download if requested
    if (download === 'true') {
      const timestamp = new Date().toISOString().replace(/:/g, '-');
      const filename = `scrape_${url.replace(/[^a-z0-9]/gi, '_').substring(0, 30)}_${timestamp}.${format}`;

      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    }

    // Send the response
    res.setHeader('Content-Type', contentType);
    res.send(data);
  } catch (error) {
    logger.error({
      message: 'Export error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(400).json({
        status: 'error',
        message: error.message,
      });
    }

    next(error);
  }
});

/**
 * @swagger
 * /api/export/formats:
 *   get:
 *     summary: Get available export formats
 *     description: Returns a list of available export formats
 *     tags: [Export]
 *     responses:
 *       200:
 *         description: List of available export formats
 */
router.get('/formats', (_req: Request, res: Response) => {
  const formats = exporterManager.getAvailableExporters();
  res.status(200).json({
    status: 'success',
    data: formats,
  });
});

export default router;
