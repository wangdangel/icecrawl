#!/usr/bin/env node

// Load environment variables FIRST, prioritizing global config if it exists
import fs from 'fs';
import os from 'os';
import path from 'path';
import * as dotenv from 'dotenv';

/**
 * Determines the default data directory path based on the operating system.
 * Mirrors the logic in scripts/global-postinstall.js
 * @returns {string} The absolute path to the default data directory.
 */
function getDefaultDataDir() {
  const homeDir = os.homedir();
  if (process.platform === 'win32') {
    return path.join(homeDir, 'Documents', 'Icecrawl');
  } else {
    // Assume Linux, macOS, or other Unix-like systems
    return path.join(homeDir, 'Icecrawl');
  }
}

const globalDataDir = getDefaultDataDir();
const globalEnvPath = path.join(globalDataDir, '.env');
const localEnvPath = path.resolve(process.cwd(), '.env'); // For local development

// Try loading global .env first, then local if global doesn't exist
if (fs.existsSync(globalEnvPath)) {
  dotenv.config({ path: globalEnvPath });
  console.log(`[Icecrawl CLI] Loaded global config from: ${globalEnvPath}`);
} else if (fs.existsSync(localEnvPath)) {
  dotenv.config({ path: localEnvPath });
  console.log(`[Icecrawl CLI] Loaded local config from: ${localEnvPath}`);
} else {
  console.warn('[Icecrawl CLI] Warning: No .env file found in global data directory or current working directory.');
  // Application might fail if required env vars (like DATABASE_URL) aren't set globally
}

// --- Rest of the CLI imports and logic ---
import { program } from 'commander';
import { scrapeUrl } from './core/scraper.js';
import { getInputFromStdin } from './utils/stdinHelper.js';
import { formatScrapedData, formatError, formatLoading } from './utils/cliFormatter.js';
import { startDashboardServer } from './index.js';
import { startMcpServer } from './mcp-server.js';

// CLI Configuration
program
  .name('icecrawl')
  .description('Icecrawl CLI: scrape, launch dashboard, or MCP server')
  .version('0.1.0');

// Global options (mainly for scrape)
program
  .option('-f, --format <format>', 'output format (pretty, json, minimal)', 'pretty')
  .option('-s, --silent', 'suppress all output except the result', false);

// Default command: start both servers
program
  .action(async () => {
    console.log('Starting Dashboard server and MCP server...');
    await Promise.all([
      (async () => { try { startDashboardServer(); } catch (e) { console.error('Dashboard server error:', e); } })(),
      (async () => { try { await startMcpServer(); } catch (e) { console.error('MCP server error:', e); } })(),
    ]);
  });

// Subcommand: scrape (stdin or url)
const scrapeCmd = program.command('scrape').description('Scrape URLs via stdin or argument');

// Scrape from stdin (default for scrape)
scrapeCmd
  .action(async () => {
    const options = program.opts();
    try {
      if (!options.silent) console.error(formatLoading('Reading from stdin'));
      const input = await getInputFromStdin();
      const url = input.trim();
      if (!url || !url.startsWith('http')) throw new Error('Invalid URL provided. Please provide a valid URL starting with http:// or https://');
      if (!options.silent) console.error(formatLoading(`Scraping content from ${url}`));
      const result = await scrapeUrl(url);
      console.log(formatScrapedData(result, options.format));
    } catch (error) {
      if (!options.silent) console.error(formatError(error instanceof Error ? error : new Error('An unknown error occurred')));
      process.exit(1);
    }
  });

// Scrape a specific URL argument
scrapeCmd
  .command('url <url>')
  .description('Scrape a specific URL')
  .action(async (url: string) => {
    const options = program.opts();
    try {
      if (!options.silent) console.error(formatLoading(`Scraping content from ${url}`));
      const result = await scrapeUrl(url);
      console.log(formatScrapedData(result, options.format));
    } catch (error) {
      if (!options.silent) console.error(formatError(error instanceof Error ? error : new Error('An unknown error occurred')));
      process.exit(1);
    }
  });

// Subcommand: dashboard
program
  .command('dashboard')
  .description('Start the Dashboard server only')
  .action(() => {
    console.log('Starting Dashboard server...');
    startDashboardServer();
  });

// Subcommand: mcp-server
program
  .command('mcp-server')
  .description('Start the MCP server only')
  .action(async () => {
    console.log('Starting MCP server...');
    await startMcpServer();
  });

// Parse args and execute
program.parse(process.argv);
