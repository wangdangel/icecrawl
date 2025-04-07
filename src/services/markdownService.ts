import TurndownService from 'turndown';
import logger from '../utils/logger';

/**
 * Service for converting HTML to Markdown.
 */
export class MarkdownService {
  private static turndownService = new TurndownService({
    headingStyle: 'atx', // Use '#' for headings
    codeBlockStyle: 'fenced', // Use ``` for code blocks
    emDelimiter: '*', // Use * for emphasis
    strongDelimiter: '**', // Use ** for strong emphasis
  });

  /**
   * Converts HTML string to Markdown string.
   *
   * @param html - The HTML content to convert.
   * @param url - The URL of the source page (optional, for logging).
   * @returns The converted Markdown string, or an empty string if conversion fails.
   */
  static convertHtmlToMarkdown(html: string, url?: string): string {
    try {
      // # Reason: Use Turndown library to convert HTML to Markdown with specific style options.
      const markdown = this.turndownService.turndown(html);
      return markdown;
    } catch (error) {
      logger.error({
        message: 'Failed to convert HTML to Markdown',
        url: url || 'N/A',
        error: error instanceof Error ? error.message : 'Unknown error',
        // Avoid logging potentially large HTML content
      });
      return ''; // Return empty string on failure
    }
  }
}
