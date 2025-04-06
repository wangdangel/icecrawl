import logger from './logger';

/**
 * Performance monitoring utility
 */
export class PerformanceMonitor {
  private static timers: Record<string, number> = {};
  
  /**
   * Start a performance timer
   * 
   * @param label - Timer label
   */
  static start(label: string): void {
    this.timers[label] = Date.now();
  }
  
  /**
   * End a performance timer and log the result
   * 
   * @param label - Timer label
   * @param additionalInfo - Additional information to log
   * @returns Duration in milliseconds
   */
  static end(label: string, additionalInfo: Record<string, unknown> = {}): number {
    const startTime = this.timers[label];
    if (!startTime) {
      logger.warn({
        message: 'Timer not found',
        label,
      });
      return 0;
    }
    
    const duration = Date.now() - startTime;
    delete this.timers[label];
    
    logger.debug({
      message: 'Performance measurement',
      label,
      duration: `${duration}ms`,
      ...additionalInfo,
    });
    
    return duration;
  }
  
  /**
   * Measure the execution time of an async function
   * 
   * @param label - Timer label
   * @param fn - Function to measure
   * @param additionalInfo - Additional information to log
   * @returns Result of the function
   */
  static async measure<T>(
    label: string, 
    fn: () => Promise<T>, 
    additionalInfo: Record<string, unknown> = {}
  ): Promise<T> {
    this.start(label);
    try {
      const result = await fn();
      this.end(label, additionalInfo);
      return result;
    } catch (error) {
      this.end(label, {
        ...additionalInfo,
        error: error instanceof Error ? error.message : 'Unknown error',
        status: 'failed',
      });
      throw error;
    }
  }
}
