import { ScrapedDataTransformer } from './transformerTypes';
import { ScrapedData } from '../core/scraper';
import logger from '../utils/logger';

/**
 * Text cleanup transformer
 */
export const textCleanupTransformer: ScrapedDataTransformer = {
  name: 'textCleanup',
  description: 'Cleans up text by removing excess whitespace, fixing common issues',
  transform: async (data: ScrapedData): Promise<ScrapedData> => {
    logger.debug('Running text cleanup transformer');
    
    // Make a copy of the data
    const result = { ...data };
    
    // Clean up content
    if (result.content) {
      result.content = result.content
        .replace(/\s+/g, ' ')
        .replace(/\n\s*\n/g, '\n\n')
        .trim();
    }
    
    return result;
  }
};

/**
 * Text summarization transformer
 */
export const textSummarizerTransformer: ScrapedDataTransformer = {
  name: 'textSummarizer',
  description: 'Creates a summary of the text content',
  transform: async (data: ScrapedData): Promise<ScrapedData & { summary: string }> => {
    logger.debug('Running text summarizer transformer');
    
    // Make a copy of the data
    const result = { ...data };
    
    // Create a simple summary (first 200 characters)
    // In a real implementation, this would use a more sophisticated algorithm
    const summary = data.content.slice(0, 200).trim() + '...';
    
    return {
      ...result,
      summary
    };
  }
};

/**
 * Keyword extraction transformer
 */
export const keywordExtractorTransformer: ScrapedDataTransformer<ScrapedData & { keywords: string[] }> = {
  name: 'keywordExtractor',
  description: 'Extracts keywords from the text content',
  transform: async (data: ScrapedData): Promise<ScrapedData & { keywords: string[] }> => {
    logger.debug('Running keyword extractor transformer');
    
    // Make a copy of the data
    const result = { ...data };
    
    // Simple keyword extraction (in a real implementation, this would be more sophisticated)
    const stopWords = new Set(['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'with', 'by']);
    const words = data.content.toLowerCase().match(/\b\w+\b/g) || [];
    
    // Count word frequency
    const wordCounts: Record<string, number> = {};
    words.forEach(word => {
      if (!stopWords.has(word) && word.length > 3) {
        wordCounts[word] = (wordCounts[word] || 0) + 1;
      }
    });
    
    // Sort by frequency
    const keywords = Object.entries(wordCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
    
    return {
      ...result,
      keywords
    };
  }
};
