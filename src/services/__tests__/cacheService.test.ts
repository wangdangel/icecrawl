import logger from '../../utils/logger';
// Mock logger to capture debug, info, error, and warn calls
jest.mock('../../utils/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));
import { CacheService, setCacheInstance } from '../cacheService';

// Mock the NodeCache module
const mockNodeCacheInstance = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  flushAll: jest.fn(),
  getStats: jest.fn(),
};

describe('CacheService', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    // Reset NodeCache mock instance methods
    mockNodeCacheInstance.get.mockClear();
    mockNodeCacheInstance.set.mockClear();
    mockNodeCacheInstance.del.mockClear();
    mockNodeCacheInstance.flushAll.mockClear();
    mockNodeCacheInstance.getStats.mockClear();
    // Use mock cache instance for CacheService
    setCacheInstance(mockNodeCacheInstance);
  });

  describe('get', () => {
    it('should return cached value if key exists', () => {
      const key = 'testKey';
      const value = { data: 'testData' };
      mockNodeCacheInstance.get.mockReturnValue(value);

      const result = CacheService.get<typeof value>(key);

      expect(result).toEqual(value);
      expect(mockNodeCacheInstance.get).toHaveBeenCalledWith(key);
      expect(logger.debug).toHaveBeenCalledWith({ message: 'Cache hit', key });
    });

    it('should return undefined if key does not exist', () => {
      const key = 'nonExistentKey';
      mockNodeCacheInstance.get.mockReturnValue(undefined);

      const result = CacheService.get(key);

      expect(result).toBeUndefined();
      expect(mockNodeCacheInstance.get).toHaveBeenCalledWith(key);
      expect(logger.debug).toHaveBeenCalledWith({ message: 'Cache miss', key });
    });

    it('should return undefined and log error if NodeCache throws', () => {
      const key = 'errorKey';
      const error = new Error('Cache internal error');
      mockNodeCacheInstance.get.mockImplementation(() => {
        throw error;
      });

      const result = CacheService.get(key);

      expect(result).toBeUndefined();
      expect(logger.error).toHaveBeenCalledWith({
        message: 'Cache get error',
        key,
        error: error.message,
      });
    });
  });

  describe('set', () => {
    it('should set value with default TTL', () => {
      const key = 'setKey';
      const value = 'setValue';
      mockNodeCacheInstance.set.mockReturnValue(true);

      const success = CacheService.set(key, value);

      expect(success).toBe(true);
      expect(mockNodeCacheInstance.set).toHaveBeenCalledWith(key, value); // No TTL passed
      expect(logger.debug).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Cache set', key, ttl: 'default', success: true }),
      );
    });

    it('should set value with specified TTL', () => {
      const key = 'setKeyTTL';
      const value = 123;
      const ttl = 600; // 10 minutes
      mockNodeCacheInstance.set.mockReturnValue(true);

      const success = CacheService.set(key, value, ttl);

      expect(success).toBe(true);
      expect(mockNodeCacheInstance.set).toHaveBeenCalledWith(key, value, ttl); // TTL passed
      expect(logger.debug).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Cache set', key, ttl, success: true }),
      );
    });

    it('should return false and log error if NodeCache throws', () => {
      const key = 'setErrorKey';
      const value = 'errorValue';
      const error = new Error('Cache set internal error');
      mockNodeCacheInstance.set.mockImplementation(() => {
        throw error;
      });

      const success = CacheService.set(key, value);

      expect(success).toBe(false);
      expect(logger.error).toHaveBeenCalledWith({
        message: 'Cache set error',
        key,
        error: error.message,
      });
    });
  });

  describe('delete', () => {
    it('should delete key and return true if successful', () => {
      const key = 'deleteKey';
      mockNodeCacheInstance.del.mockReturnValue(1); // node-cache returns number of deleted keys

      const success = CacheService.delete(key);

      expect(success).toBe(true);
      expect(mockNodeCacheInstance.del).toHaveBeenCalledWith(key);
      expect(logger.debug).toHaveBeenCalledWith({ message: 'Cache delete', key, deleted: 1 });
    });

    it('should return false if key did not exist', () => {
      const key = 'deleteNonExistentKey';
      mockNodeCacheInstance.del.mockReturnValue(0); // Key didn't exist

      const success = CacheService.delete(key);

      expect(success).toBe(false);
      expect(mockNodeCacheInstance.del).toHaveBeenCalledWith(key);
      expect(logger.debug).toHaveBeenCalledWith({ message: 'Cache delete', key, deleted: 0 });
    });

    it('should return false and log error if NodeCache throws', () => {
      const key = 'deleteErrorKey';
      const error = new Error('Cache delete internal error');
      mockNodeCacheInstance.del.mockImplementation(() => {
        throw error;
      });

      const success = CacheService.delete(key);

      expect(success).toBe(false);
      expect(logger.error).toHaveBeenCalledWith({
        message: 'Cache delete error',
        key,
        error: error.message,
      });
    });
  });

  describe('clear', () => {
    it('should call flushAll on the cache instance', () => {
      CacheService.clear();
      expect(mockNodeCacheInstance.flushAll).toHaveBeenCalledTimes(1);
      expect(logger.info).toHaveBeenCalledWith({ message: 'Cache cleared' });
    });

    it('should log error if NodeCache throws', () => {
      const error = new Error('Cache flush internal error');
      mockNodeCacheInstance.flushAll.mockImplementation(() => {
        throw error;
      });

      CacheService.clear();

      expect(logger.error).toHaveBeenCalledWith({
        message: 'Cache clear error',
        error: error.message,
      });
    });
  });

  describe('getStats', () => {
    it('should call getStats on the cache instance', () => {
      const mockStats = { keys: 10, hits: 5, misses: 2, ksize: 1024, vsize: 2048 };
      mockNodeCacheInstance.getStats.mockReturnValue(mockStats);

      const stats = CacheService.getStats();

      expect(stats).toEqual(mockStats);
      expect(mockNodeCacheInstance.getStats).toHaveBeenCalledTimes(1);
    });
  });
});
