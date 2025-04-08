import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { pipelineManager } from '../transformers/pipelineManager';
import { scrapeUrl } from '../core/scraper';
import logger from '../utils/logger';

const router = Router();

// Input validation schema
const transformUrlSchema = z.object({
  url: z.string().url(),
  pipeline: z.string().optional(),
  transformer: z.string().optional(),
});

/**
 * @swagger
 * /api/transform:
 *   get:
 *     summary: Transform content from a URL
 *     description: Scrapes and transforms content from the provided URL
 *     tags: [Transformation]
 *     parameters:
 *       - in: query
 *         name: url
 *         required: true
 *         schema:
 *           type: string
 *           format: uri
 *         description: The URL to scrape and transform
 *       - in: query
 *         name: pipeline
 *         required: false
 *         schema:
 *           type: string
 *         description: The pipeline to use for transformation
 *       - in: query
 *         name: transformer
 *         required: false
 *         schema:
 *           type: string
 *         description: A single transformer to use (alternative to pipeline)
 *     responses:
 *       200:
 *         description: Successfully transformed content
 *       400:
 *         description: Invalid parameters
 *       500:
 *         description: Server error
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validate input
    const parsedInput = transformUrlSchema.safeParse(req.query);
    if (!parsedInput.success) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid parameters',
        details: parsedInput.error.format(),
      });
    }
    
    const { url, pipeline, transformer } = parsedInput.data;
    
    // Must specify either pipeline or transformer
    if (!pipeline && !transformer) {
      return res.status(400).json({
        status: 'error',
        message: 'Must specify either pipeline or transformer',
      });
    }
    
    // Scrape the URL
    const scrapedData = await scrapeUrl(url);
    
    // Transform the data
    let transformedData;
    if (pipeline) {
      transformedData = await pipelineManager.runPipeline(pipeline, scrapedData);
    } else if (transformer) {
      transformedData = await pipelineManager.runTransformer(transformer, scrapedData);
    }
    
    return res.status(200).json({
      status: 'success',
      data: transformedData,
    });
  } catch (error) {
    logger.error({
      message: 'Transformation error',
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
 * /api/transform/pipelines:
 *   get:
 *     summary: Get available pipelines
 *     description: Returns a list of available transformation pipelines
 *     tags: [Transformation]
 *     responses:
 *       200:
 *         description: List of available pipelines
 */
router.get('/pipelines', (_req: Request, res: Response) => {
  const pipelines = pipelineManager.getAvailablePipelines();
  res.status(200).json({
    status: 'success',
    data: pipelines,
  });
});

/**
 * @swagger
 * /api/transform/transformers:
 *   get:
 *     summary: Get available transformers
 *     description: Returns a list of available transformers
 *     tags: [Transformation]
 *     responses:
 *       200:
 *         description: List of available transformers
 */
router.get('/transformers', (_req: Request, res: Response) => {
  const transformers = pipelineManager.getAvailableTransformers();
  res.status(200).json({
    status: 'success',
    data: transformers,
  });
});

/**
 * POST /api/transform/transformers/:name/apply
 * Apply a single transformer to provided content
 */
router.post('/transformers/:name/apply', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const transformerName = req.params.name;
    const { content, config } = req.body;

    if (typeof content !== 'string') {
      return res.status(400).json({ status: 'error', message: 'Missing or invalid content' });
    }

    const transformer = pipelineManager['transformers'].get(transformerName);
    if (!transformer) {
      return res.status(404).json({ status: 'error', message: `Transformer not found: ${transformerName}` });
    }

    const input = { content }; // minimal ScrapedData
    const result = await transformer.transform(input, config);

    res.status(200).json({ status: 'success', data: result });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/transform/pipelines/:name/run
 * Run a pipeline on provided content
 */
router.post('/pipelines/:name/run', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pipelineName = req.params.name;
    const { content, stepConfigs } = req.body;

    if (typeof content !== 'string') {
      return res.status(400).json({ status: 'error', message: 'Missing or invalid content' });
    }

    const pipeline = pipelineManager['pipelines'].get(pipelineName);
    if (!pipeline) {
      return res.status(404).json({ status: 'error', message: `Pipeline not found: ${pipelineName}` });
    }

    // Clone pipeline and inject step configs if provided
    const pipelineWithConfigs = {
      ...pipeline,
      steps: pipeline.steps.map((step, idx) => ({
        ...step,
        config: stepConfigs?.[idx] || step.config
      }))
    };

    const input = { content }; // minimal ScrapedData
    const result = await pipelineManager.runPipeline(pipelineName, input);

    res.status(200).json({ status: 'success', data: result });
  } catch (error) {
    next(error);
  }
});

export default router;
