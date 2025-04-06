import logger from './logger';

/**
 * Request Pool Manager for limiting concurrent requests
 */
export class RequestPoolManager {
  private maxConcurrent: number;
  private currentConcurrent: number;
  private queue: Array<() => Promise<void>>;
  
  /**
   * Create a new RequestPoolManager
   * 
   * @param maxConcurrent - Maximum number of concurrent requests
   */
  constructor(maxConcurrent = 5) {
    this.maxConcurrent = maxConcurrent;
    this.currentConcurrent = 0;
    this.queue = [];
    
    logger.info({
      message: 'Request pool initialized',
      maxConcurrent,
    });
  }
  
  /**
   * Add a task to the pool
   * 
   * @param task - The async task to execute
   * @returns Promise that resolves when the task completes
   */
  async add<T>(task: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      // Create a wrapped task
      const wrappedTask = async () => {
        try {
          this.currentConcurrent++;
          const result = await task();
          resolve(result);
          return result;
        } catch (error) {
          reject(error);
          throw error;
        } finally {
          this.currentConcurrent--;
          this.processQueue();
        }
      };
      
      // If we can execute immediately, do so
      if (this.currentConcurrent < this.maxConcurrent) {
        wrappedTask().catch(() => {});
      } else {
        // Otherwise, add to queue
        this.queue.push(wrappedTask);
      }
    });
  }
  
  /**
   * Process the next item in the queue if possible
   */
  private processQueue(): void {
    if (this.queue.length > 0 && this.currentConcurrent < this.maxConcurrent) {
      const nextTask = this.queue.shift();
      if (nextTask) {
        nextTask().catch(() => {});
      }
    }
  }
  
  /**
   * Get the current status of the pool
   * 
   * @returns Pool status
   */
  getStatus(): { maxConcurrent: number; currentConcurrent: number; queueLength: number } {
    return {
      maxConcurrent: this.maxConcurrent,
      currentConcurrent: this.currentConcurrent,
      queueLength: this.queue.length,
    };
  }
}

// Create a singleton instance
export const requestPool = new RequestPoolManager();
