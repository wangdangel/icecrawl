import { ScrapedData } from '../core/scraper';

/**
 * Transformer interface
 */
export interface Transformer<T = any, U = any> {
  name: string;
  description: string;
  transform: (input: T, config?: Record<string, any>) => Promise<U>;
}

/**
 * Base transformer for ScrapedData
 */
export type ScrapedDataTransformer<U = any> = Transformer<ScrapedData, U>;

/**
 * Pipeline configuration
 */
export interface PipelineConfig {
  name: string;
  description: string;
  steps: Array<{
    transformer: string;
    config?: Record<string, any>;
  }>;
}
