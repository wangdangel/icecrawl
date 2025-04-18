import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../db/prismaClient';
import { authenticate } from '../middleware/authMiddleware';
import logger from '../utils/logger';

const router = Router();

// GET /api/cookies?domain=example.com
const getCookieSchema = z.object({ domain: z.string().min(1) });
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const parsed = getCookieSchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ status: 'error', message: 'Domain is required' });
    }
    const { domain } = parsed.data;
    const cookieRec = await (prisma as any).cookie.findUnique({
      where: { domain_userId: { domain, userId: req.user?.id ?? null } },
    });
    if (cookieRec) {
      return res.status(200).json({ status: 'success', data: cookieRec });
    } else {
      return res.status(404).json({ status: 'not_found', message: 'No cookie found for domain' });
    }
  } catch (error) {
    logger.error({ message: 'Error fetching cookie', error });
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

// POST /api/cookies
const postCookieSchema = z.object({ domain: z.string().min(1), cookieString: z.string().min(1) });
router.post('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = postCookieSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ status: 'error', message: 'Invalid request data', details: parsed.error.format() });
    }
    const { domain, cookieString } = parsed.data;
    const cookieRec = await (prisma as any).cookie.upsert({
      where: { domain_userId: { domain, userId: req.user?.id ?? null } },
      create: { domain, cookieString, userId: req.user?.id ?? null },
      update: { cookieString, updatedAt: new Date() },
    });
    return res.status(200).json({ status: 'success', data: cookieRec });
  } catch (error) {
    logger.error({ message: 'Error saving cookie', error });
    next(error);
  }
});

export default router;
