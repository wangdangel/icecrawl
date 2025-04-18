import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { proxyManager } from '../services/proxyManager.js';
import logger from '../utils/logger.js';
import { authenticate, requireAdmin } from '../middleware/authMiddleware.js';

const router = Router();

// Apply authentication middleware
router.use(authenticate);
router.use(requireAdmin);

// Input validation schema
const addProxySchema = z.object({
  host: z.string(),
  port: z.number().int().positive(),
  username: z.string().optional(),
  password: z.string().optional(),
});

/**
 * @swagger
 * /api/proxies:
 *   get:
 *     summary: Get all proxies
 *     description: Returns a list of all configured proxies
 *     tags: [Proxies]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of proxies
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.get('/', (_req: Request, res: Response) => {
  const proxies = proxyManager.getAllProxies().map(p => ({
    host: p.host,
    port: p.port,
    auth: p.auth ? true : false,
    active: p.active,
    lastUsed: p.lastUsed,
    successCount: p.successCount,
    failCount: p.failCount,
  }));

  res.status(200).json({
    status: 'success',
    data: proxies,
  });
});

/**
 * @swagger
 * /api/proxies:
 *   post:
 *     summary: Add a new proxy
 *     description: Adds a new proxy to the pool
 *     tags: [Proxies]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - host
 *               - port
 *             properties:
 *               host:
 *                 type: string
 *               port:
 *                 type: number
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: Proxy added successfully
 *       400:
 *         description: Invalid parameters
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    // Validate input
    const parsedInput = addProxySchema.safeParse(req.body);
    if (!parsedInput.success) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid parameters',
        details: parsedInput.error.format(),
      });
    }

    const { host, port, username, password } = parsedInput.data;

    // Create proxy config
    const proxyConfig = {
      host,
      port,
      ...(username && password ? { auth: { username, password } } : {}),
    };

    // Add to pool
    proxyManager.addProxy(proxyConfig);

    logger.info({
      message: 'Proxy added',
      host,
      port,
      auth: username && password ? true : false,
      userId: req.user?.id, // Add optional chaining
    });

    res.status(201).json({
      status: 'success',
      message: 'Proxy added successfully',
    });
  } catch (error) {
    logger.error({
      message: 'Error adding proxy',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    res.status(500).json({
      status: 'error',
      message: 'An error occurred while adding the proxy',
    });
  }
});

/**
 * @swagger
 * /api/proxies/{host}/{port}/reactivate:
 *   post:
 *     summary: Reactivate a proxy
 *     description: Reactivates a previously deactivated proxy
 *     tags: [Proxies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: host
 *         required: true
 *         schema:
 *           type: string
 *         description: Proxy host
 *       - in: path
 *         name: port
 *         required: true
 *         schema:
 *           type: integer
 *         description: Proxy port
 *     responses:
 *       200:
 *         description: Proxy reactivated successfully
 *       404:
 *         description: Proxy not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.post('/:host/:port/reactivate', (req: Request, res: Response) => {
  const { host, port } = req.params;

  proxyManager.reactivateProxy(host, parseInt(port));

  logger.info({
    message: 'Proxy reactivation requested',
    host,
    port,
    userId: req.user?.id, // Add optional chaining
  });

  res.status(200).json({
    status: 'success',
    message: 'Proxy reactivated',
  });
});

export default router;
