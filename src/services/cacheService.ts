import NodeCache from 'node-cache';
import logger from '../utils/logger';

// Configure cache with default TTL of 1 hour and check period of 10 minutes
const defaultCache = new NodeCache({
  stdTTL: 3600, // 1 hour in seconds
  checkperiod: 600, // 10 minutes in seconds
});
// Use default cache instance, but allow override for testing
let cache: NodeCache = defaultCache;

/**
 * Override the cache instance (useful for testing)
 */
export function setCacheInstance(newCache: Partial<NodeCache>) {
  cache = newCache as NodeCache;
}

/**
 * Cache service for storing and retrieving scraped data
 */
export class CacheService {
  /**
   * Get data from cache
   *
   * @param key - Cache key
   * @returns Cached data or undefined if not found/expired
   */
  static get<T>(key: string): T | undefined {
    try {
      const value = cache.get<T>(key);
      if (value) {
        logger.debug({ message: 'Cache hit', key });
      } else {
        logger.debug({ message: 'Cache miss', key });
      }
      return value;
    } catch (error) {
      logger.error({
        message: 'Cache get error',
        key,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return undefined;
    }
  }

  /**
   * Store data in cache
   *
   * @param key - Cache key
   * @param value - Data to cache
   * @param ttl - Time to live in seconds (optional)
   * @returns Success or failure
   */
  static set<T>(key: string, value: T, ttl?: number): boolean {
    try {
      // Only pass ttl if it's defined
      const success = ttl !== undefined ? cache.set(key, value, ttl) : cache.set(key, value);
      logger.debug({
        message: 'Cache set',
        key,
        ttl: ttl || 'default',
        success,
      });
      return success;
    } catch (error) {
      logger.error({
        message: 'Cache set error',
        key,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  /**
   * Remove data from cache
   *
   * @param key - Cache key
   * @returns Success or failure
   */
  static delete(key: string): boolean {
    try {
      const deleted = cache.del(key);
      logger.debug({
        message: 'Cache delete',
        key,
        deleted,
      });
      return deleted > 0;
    } catch (error) {
      logger.error({
        message: 'Cache delete error',
        key,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  /**
   * Clear entire cache
   */
  static clear(): void {
    try {
      cache.flushAll();
      logger.info({ message: 'Cache cleared' });
    } catch (error) {
      logger.error({
        message: 'Cache clear error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get cache statistics
   *
   * @returns Cache statistics
   */
  static getStats(): NodeCache.Stats {
    return cache.getStats();
  }
}
