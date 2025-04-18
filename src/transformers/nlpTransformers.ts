import { ScrapedDataTransformer } from './transformerTypes';
import { ScrapedData } from '../core/scraper';
import logger from '../utils/logger';

/**
 * Language detection transformer
 */
export const languageDetectorTransformer: ScrapedDataTransformer<
  ScrapedData & { language: string }
> = {
  name: 'languageDetector',
  description: 'Detects the language of the text content',
  transform: async (data: ScrapedData): Promise<ScrapedData & { language: string }> => {
    logger.debug('Running language detector transformer');

    // Simple language detection (in a real implementation, this would use a library like franc or langdetect)
    let language = 'en'; // Default to English

    // Very basic detection logic - just for demonstration
    const content = data.content.toLowerCase();
    if (
      content.includes('el') &&
      content.includes('la') &&
      content.includes('que') &&
      content.includes('de')
    ) {
      language = 'es'; // Spanish
    } else if (
      content.includes('le') &&
      content.includes('la') &&
      content.includes('les') &&
      content.includes('et')
    ) {
      language = 'fr'; // French
    } else if (
      content.includes('der') &&
      content.includes('die') &&
      content.includes('das') &&
      content.includes('und')
    ) {
      language = 'de'; // German
    }

    return {
      ...data,
      language,
    };
  },
};

/**
 * Sentiment analysis transformer
 */
export const sentimentAnalyzerTransformer: ScrapedDataTransformer<
  ScrapedData & { sentiment: { score: number; label: string } }
> = {
  name: 'sentimentAnalyzer',
  description: 'Analyzes the sentiment of the text content',
  transform: async (
    data: ScrapedData,
  ): Promise<ScrapedData & { sentiment: { score: number; label: string } }> => {
    logger.debug('Running sentiment analyzer transformer');

    // Simple sentiment analysis (in a real implementation, this would use a more sophisticated algorithm)
    const content = data.content.toLowerCase();

    // Define positive and negative words
    const positiveWords = [
      'good',
      'great',
      'excellent',
      'best',
      'amazing',
      'wonderful',
      'fantastic',
      'happy',
      'love',
      'like',
    ];
    const negativeWords = [
      'bad',
      'worst',
      'terrible',
      'awful',
      'horrible',
      'poor',
      'sad',
      'hate',
      'dislike',
      'disappointing',
    ];

    // Count occurrences
    let positiveCount = 0;
    let negativeCount = 0;

    positiveWords.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      const matches = content.match(regex);
      positiveCount += matches ? matches.length : 0;
    });

    negativeWords.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      const matches = content.match(regex);
      negativeCount += matches ? matches.length : 0;
    });

    // Calculate score (-1 to 1)
    const totalWords = positiveCount + negativeCount;
    const score = totalWords === 0 ? 0 : (positiveCount - negativeCount) / totalWords;

    // Determine label
    let label = 'neutral';
    if (score > 0.3) label = 'positive';
    else if (score < -0.3) label = 'negative';

    return {
      ...data,
      sentiment: {
        score,
        label,
      },
    };
  },
};
