import chalk from 'chalk';
import Table from 'cli-table3';
import { ScrapedData } from '../core/scraper';

/**
 * Format scraped data for CLI output
 *
 * @param data - The scraped data to format
 * @param outputFormat - The desired output format (pretty, json, minimal)
 * @returns Formatted string representation of the data
 */
export function formatScrapedData(
  data: ScrapedData,
  outputFormat: 'pretty' | 'json' | 'minimal' = 'pretty',
): string {
  switch (outputFormat) {
    case 'json':
      return JSON.stringify(data, null, 2);

    case 'minimal':
      return `${chalk.bold(data.title)}\n${data.url}\n\n${data.content.substring(0, 150)}...`;

    case 'pretty':
    default:
      // Create a formatted table with the data
      const table = new Table({
        head: [chalk.cyan('Property'), chalk.cyan('Value')],
        colWidths: [20, 80],
        wordWrap: true,
      });

      // Add rows to the table
      table.push(
        [chalk.bold('URL'), data.url],
        [chalk.bold('Title'), data.title],
        [chalk.bold('Timestamp'), data.timestamp],
        [
          chalk.bold('Content Preview'),
          `${data.content.substring(0, 300)}${data.content.length > 300 ? '...' : ''}`,
        ],
      );

      // Add metadata as separate rows
      Object.entries(data.metadata).forEach(([key, value]) => {
        if (value && value.toString().trim()) {
          table.push([
            chalk.bold(`Metadata: ${key}`),
            typeof value === 'string' ? value : JSON.stringify(value),
          ]);
        }
      });

      return `\n${chalk.green.bold('✓')} Successfully scraped content from ${chalk.blue(data.url)}\n\n${table.toString()}\n`;
  }
}

/**
 * Format error messages for CLI output
 *
 * @param error - The error to format
 * @returns Formatted error message
 */
export function formatError(error: Error): string {
  return `\n${chalk.red.bold('✗')} Error: ${chalk.red(error.message)}\n`;
}

/**
 * Display a loading message
 *
 * @param message - The message to display
 * @returns The message with loading indicator
 */
export function formatLoading(message: string): string {
  return `${chalk.yellow('⟳')} ${chalk.yellow(message)}...`;
}
