import { Transformer, PipelineConfig } from './transformerTypes';
import logger from '../utils/logger';
import {
  textCleanupTransformer,
  textSummarizerTransformer,
  keywordExtractorTransformer,
} from './textTransformers';
import { languageDetectorTransformer, sentimentAnalyzerTransformer } from './nlpTransformers';

/**
 * Pipeline manager for data transformation
 */
export class PipelineManager {
  private transformers: Map<string, Transformer> = new Map();
  private pipelines: Map<string, PipelineConfig> = new Map();

  constructor() {
    // Register built-in transformers
    this.registerTransformer(textCleanupTransformer);
    this.registerTransformer(textSummarizerTransformer);
    this.registerTransformer(keywordExtractorTransformer);
    this.registerTransformer(languageDetectorTransformer);
    this.registerTransformer(sentimentAnalyzerTransformer);
  }

  /**
   * Register a transformer
   *
   * @param transformer - Transformer to register
   */
  registerTransformer(transformer: Transformer): void {
    this.transformers.set(transformer.name, transformer);
    logger.debug(`Registered transformer: ${transformer.name}`);
  }

  /**
   * Register a pipeline
   *
   * @param pipeline - Pipeline configuration
   */
  registerPipeline(pipeline: PipelineConfig): void {
    this.pipelines.set(pipeline.name, pipeline);
    logger.info(`Registered pipeline: ${pipeline.name}`);
  }

  /**
   * Get available transformers
   *
   * @returns Array of transformer information
   */
  getAvailableTransformers(): Array<{ name: string; description: string }> {
    return Array.from(this.transformers.values()).map(t => ({
      name: t.name,
      description: t.description,
    }));
  }

  /**
   * Get available pipelines
   *
   * @returns Array of pipeline information
   */
  getAvailablePipelines(): Array<{ name: string; description: string }> {
    return Array.from(this.pipelines.values()).map(p => ({
      name: p.name,
      description: p.description,
    }));
  }

  /**
   * Get a pipeline by name
   * @param name - Pipeline name
   * @returns PipelineConfig or undefined
   */
  public getPipeline(name: string): PipelineConfig | undefined {
    return this.pipelines.get(name);
  }

  /**
   * Run a pipeline on input data
   *
   * @param pipelineName - Name of the pipeline to run
   * @param input - Input data
   * @returns Transformed data
   */
  async runPipeline(pipelineName: string, input: any): Promise<any> {
    const pipeline = this.pipelines.get(pipelineName);
    if (!pipeline) {
      throw new Error(`Pipeline not found: ${pipelineName}`);
    }

    logger.info(`Running pipeline: ${pipelineName}`);

    let result = input;

    for (const step of pipeline.steps) {
      const transformer = this.transformers.get(step.transformer);
      if (!transformer) {
        throw new Error(`Transformer not found: ${step.transformer}`);
      }

      logger.debug(`Running transformer: ${transformer.name}`);
      result = await transformer.transform(result, step.config);
    }

    return result;
  }

  /**
   * Run a single transformer on input data
   *
   * @param transformerName - Name of the transformer to run
   * @param input - Input data
   * @returns Transformed data
   */
  async runTransformer(transformerName: string, input: any): Promise<any> {
    const transformer = this.transformers.get(transformerName);
    if (!transformer) {
      throw new Error(`Transformer not found: ${transformerName}`);
    }

    logger.debug(`Running transformer: ${transformer.name}`);
    return transformer.transform(input);
  }
}

// Create and export a singleton instance
export const pipelineManager = new PipelineManager();

// Register some predefined pipelines
pipelineManager.registerPipeline({
  name: 'basicAnalysis',
  description: 'Basic text analysis pipeline',
  steps: [{ transformer: 'textCleanup' }, { transformer: 'keywordExtractor' }],
});

pipelineManager.registerPipeline({
  name: 'fullAnalysis',
  description: 'Complete content analysis pipeline',
  steps: [
    { transformer: 'textCleanup' },
    { transformer: 'keywordExtractor' },
    { transformer: 'languageDetector' },
    { transformer: 'sentimentAnalyzer' },
    { transformer: 'textSummarizer' },
  ],
});
