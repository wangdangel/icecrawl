import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  // Capture the start time
  const start = Date.now();

  // Track response
  res.on('finish', () => {
    const duration = Date.now() - start;

    // Log at appropriate level based on status code
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';

    logger[level]({
      message: 'Request processed',
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('user-agent') || 'unknown',
      ip: req.ip || req.ips,
    });
  });

  next();
};
