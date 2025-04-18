import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { ApiKeyService } from '../services/api-key-service.js';
import { authenticate } from '../middleware/authMiddleware.js';
import logger from '../utils/logger.js';

const router = Router();

// Validation schemas
const createApiKeySchema = z.object({
  name: z.string().min(1).max(100),
  permissions: z.array(z.string()).optional(),
});

/**
 * @swagger
 * /api/keys:
 *   get:
 *     summary: Get API keys
 *     description: Returns a list of API keys for the authenticated user
 *     tags: [API Keys]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of API keys
 *       401:
 *         description: Not authenticated
 */
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const apiKeys = await ApiKeyService.getApiKeysForUser(req.user!.id);

    // Remove actual key from response for security
    const safeApiKeys = apiKeys.map(key => {
      const { key: actualKey, ...safeKey } = key;
      return {
        ...safeKey,
        // Show only first and last few characters of the key
        keyPreview: actualKey.substring(0, 4) + '...' + actualKey.substring(actualKey.length - 4),
      };
    });

    res.json({
      status: 'success',
      data: {
        apiKeys: safeApiKeys,
      },
    });
  } catch (error) {
    logger.error({
      message: 'Error getting API keys',
      userId: req.user?.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    res.status(500).json({
      status: 'error',
      message: 'Failed to get API keys',
    });
  }
});

/**
 * @swagger
 * /api/keys:
 *   post:
 *     summary: Create API key
 *     description: Creates a new API key for the authenticated user
 *     tags: [API Keys]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: API key created
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Not authenticated
 */
router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    // Validate input
    const parsedInput = createApiKeySchema.safeParse(req.body);
    if (!parsedInput.success) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid input',
        details: parsedInput.error.format(),
      });
    }

    const { name, permissions } = parsedInput.data;

    // Create API key
    const apiKey = await ApiKeyService.createApiKey({
      name,
      userId: req.user!.id,
      permissions,
    });

    res.status(201).json({
      status: 'success',
      message: 'API key created',
      data: {
        // Include the full key in the response
        // This is the only time the full key will be shown
        id: apiKey.id,
        name: apiKey.name,
        key: apiKey.key,
        createdAt: apiKey.createdAt,
      },
    });
  } catch (error) {
    logger.error({
      message: 'Error creating API key',
      userId: req.user?.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    res.status(500).json({
      status: 'error',
      message: 'Failed to create API key',
    });
  }
});

/**
 * @swagger
 * /api/keys/{id}/revoke:
 *   post:
 *     summary: Revoke API key
 *     description: Revokes an API key
 *     tags: [API Keys]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: API key ID
 *     responses:
 *       200:
 *         description: API key revoked
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 *       404:
 *         description: API key not found
 */
router.post('/:id/revoke', authenticate, async (req: Request, res: Response) => {
  try {
    const id = req.params.id;

    // Revoke API key
    const success = await ApiKeyService.revokeApiKey(id, req.user!.id);

    if (!success) {
      return res.status(404).json({
        status: 'error',
        message: 'API key not found or not owned by user',
      });
    }

    res.json({
      status: 'success',
      message: 'API key revoked',
    });
  } catch (error) {
    logger.error({
      message: 'Error revoking API key',
      userId: req.user?.id,
      keyId: req.params.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    res.status(500).json({
      status: 'error',
      message: 'Failed to revoke API key',
    });
  }
});

/**
 * @swagger
 * /api/keys/{id}:
 *   delete:
 *     summary: Delete API key
 *     description: Permanently deletes an API key
 *     tags: [API Keys]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: API key ID
 *     responses:
 *       200:
 *         description: API key deleted
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 *       404:
 *         description: API key not found
 */
router.delete('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const id = req.params.id;

    // Delete API key
    const success = await ApiKeyService.deleteApiKey(id, req.user!.id);

    if (!success) {
      return res.status(404).json({
        status: 'error',
        message: 'API key not found or not owned by user',
      });
    }

    res.json({
      status: 'success',
      message: 'API key deleted',
    });
  } catch (error) {
    logger.error({
      message: 'Error deleting API key',
      userId: req.user?.id,
      keyId: req.params.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    res.status(500).json({
      status: 'error',
      message: 'Failed to delete API key',
    });
  }
});

export default router;
