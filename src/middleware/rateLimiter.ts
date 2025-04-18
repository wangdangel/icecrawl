import rateLimit from 'express-rate-limit';

/**
 * Creates a rate limiter middleware
 *
 * @param windowMs - Time window in milliseconds
 * @param max - Maximum number of requests per window
 * @returns Rate limiter middleware
 */
export const createRateLimiter = (windowMs = 15 * 60 * 1000, max = 100) => {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      status: 'error',
      message: 'Too many requests, please try again later.',
    },
  });
};

// Default rate limiter (100 requests per 15 minutes)
export const defaultRateLimiter = createRateLimiter();

// Stricter rate limiter for scraping endpoint (30 requests per 15 minutes)
export const scrapingRateLimiter = createRateLimiter(15 * 60 * 1000, 30);
