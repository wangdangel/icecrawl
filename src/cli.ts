#!/usr/bin/env node

import { program } from 'commander';
import { scrapeUrl } from './core/scraper';
import { getInputFromStdin } from './utils/stdinHelper';
import { formatScrapedData, formatError, formatLoading } from './utils/cliFormatter';

// CLI Configuration
program
  .name('webscraper')
  .description('CLI tool for web scraping with stdin/stdout interface')
  .version('0.1.0');

// Output format option
program
  .option('-f, --format <format>', 'output format (pretty, json, minimal)', 'pretty')
  .option('-s, --silent', 'suppress all output except the result', false);

// Default command (processes stdin/stdout)
program
  .action(async (options) => {
    try {
      if (!options.silent) {
        console.error(formatLoading('Reading from stdin'));
      }
      
      // Read input from stdin
      const input = await getInputFromStdin();
      
      // Parse input (expecting a URL)
      const url = input.trim();
      if (!url || !url.startsWith('http')) {
        throw new Error('Invalid URL provided. Please provide a valid URL starting with http:// or https://');
      }
      
      if (!options.silent) {
        console.error(formatLoading(`Scraping content from ${url}`));
      }
      
      // Perform scraping
      const result = await scrapeUrl(url);
      
      // Output result to stdout
      console.log(formatScrapedData(result, options.format));
      
    } catch (error) {
      if (!options.silent) {
        console.error(formatError(error instanceof Error ? error : new Error('An unknown error occurred')));
      }
      process.exit(1);
    }
  });

// URL command (direct URL input)
program
  .command('url <url>')
  .description('Scrape a specific URL')
  .action(async (url: string, options) => {
    try {
      if (!options.silent) {
        console.error(formatLoading(`Scraping content from ${url}`));
      }
      
      const result = await scrapeUrl(url);
      console.log(formatScrapedData(result, options.format));
    } catch (error) {
      if (!options.silent) {
        console.error(formatError(error instanceof Error ? error : new Error('An unknown error occurred')));
      }
      process.exit(1);
    }
  });

// Parse args and execute
program.parse(process.argv);
