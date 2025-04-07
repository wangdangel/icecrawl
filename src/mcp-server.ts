#!/usr/bin/env node

// Load environment variables from .env file
import * as dotenv from 'dotenv';
dotenv.config();

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';

import { scrapeUrl, ScrapedData } from './core/scraper'; // Correct import
// Crawler import might be unused now, but keep for potential future use
import { Crawler } from './core/crawler';
import { MarkdownService } from './services/markdownService';
import prisma from './db/prismaClient';
import { BrowserService } from './services/browserService'; // For screenshots
import logger from './utils/logger';
import * as cheerio from 'cheerio'; // Import statically
// Import content extractors statically with .js extension
import { extractMainContent, extractMetadata, extractLinks } from './utils/contentExtractor.js';

// Define interfaces for tool arguments for type safety
interface ScrapeUrlArgs {
  url: string;
  outputFormats?: ('json' | 'markdown' | 'html' | 'screenshot')[];
  selectors?: Record<string, string>;
  useBrowser?: boolean;
  waitForSelector?: string;
  proxy?: string;
}

interface StartCrawlArgs {
    startUrl: string;
    outputFormat?: 'json' | 'markdown' | 'both';
    maxDepth?: number;
    domainScope?: boolean; // Consider using the specific type from crawler.ts if exported
    includePatterns?: string[];
    excludePatterns?: string[];
    useBrowser?: boolean;
    waitForSelector?: string;
    proxy?: string;
}

interface GetCrawlJobResultArgs {
    jobId: string;
}

// Type guards for argument validation
function isValidScrapeUrlArgs(args: any): args is ScrapeUrlArgs {
    return typeof args === 'object' && args !== null && typeof args.url === 'string';
}

function isValidStartCrawlArgs(args: any): args is StartCrawlArgs {
    return typeof args === 'object' && args !== null && typeof args.startUrl === 'string';
}

function isValidGetCrawlJobResultArgs(args: any): args is GetCrawlJobResultArgs {
    return typeof args === 'object' && args !== null && typeof args.jobId === 'string';
}


class IceCrawlMcpServer {
  private server: Server;
  // No scraper instance needed
  // No crawler instance needed
  private markdownService: MarkdownService; // Keep instance if methods aren't static
  // No browserService instance needed

  constructor() {
    this.server = new Server(
      {
        name: 'icecrawl-mcp-server',
        version: '0.1.0', // TODO: Sync with package.json version
      },
      {
        capabilities: {
          resources: {},
          tools: {},
        },
      }
    );

    // Initialize services that need instantiation
    this.markdownService = new MarkdownService(); // Assuming it needs instantiation

    this.setupToolHandlers();

    // Error handling & Shutdown
    this.server.onerror = (error) => logger.error('[MCP Error]', error);
    const shutdown = async (signal: string) => {
        logger.info(`Received ${signal}, shutting down MCP server...`);
        await this.server.close();
        await BrowserService.close(); // Close shared browser
        // Add prisma disconnect if needed: await prisma.$disconnect();
        process.exit(0);
    };
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  }

  private setupToolHandlers() {
    // --- ListTools Handler ---
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
        logger.info('Handling ListTools request...'); // Add logging
        try {
            const toolsList = [
                {
                  name: 'scrape_url',
                  description: 'Fetches, scrapes, and optionally captures HTML/screenshot from a single URL.',
                  inputSchema: {
                    type: 'object',
                    properties: {
                      url: { type: 'string', description: 'The URL to scrape.' },
                      outputFormats: {
                        type: 'array',
                        items: {
                           type: 'string',
                           enum: ['json', 'markdown', 'html', 'screenshot'] // Re-add enum correctly within items
                        },
                        default: ['json'],
                        description: 'Desired output formats.',
                      },
                      selectors: {
                        type: 'object',
                        additionalProperties: { type: 'string' },
                        description: 'CSS selectors for JSON output (e.g., {"title": "h1"}).',
                      },
                      useBrowser: {
                        type: 'boolean',
                        default: false,
                        description: 'Use headless browser (forced true for screenshots).',
                      },
                      waitForSelector: {
                        type: 'string',
                        description: 'CSS selector to wait for if useBrowser is true.',
                      },
                      proxy: { type: 'string', description: 'Optional proxy URL.' },
                    },
                    required: ['url'],
                  },
                },
                {
                    name: 'start_crawl',
                    description: 'Initiates an asynchronous job to crawl a website. Returns a job ID.',
                    inputSchema: {
                      type: 'object',
                      properties: {
                        startUrl: { type: 'string', description: 'The starting URL for the crawl.' },
                        outputFormat: {
                          type: 'string',
                          enum: ['json', 'markdown', 'both'], // Keep enum here for now
                          default: 'markdown',
                          description: 'Desired final output format for the completed job.',
                        },
                        maxDepth: { type: 'integer', default: 2, description: 'Maximum crawl depth.' },
                        domainScope: { type: 'boolean', default: true, description: 'Restrict crawl to start URL domain.' },
                        includePatterns: { type: 'array', items: { type: 'string' }, description: 'Regex patterns for URLs to include.' },
                        excludePatterns: { type: 'array', items: { type: 'string' }, description: 'Regex patterns for URLs to exclude.' },
                        useBrowser: { type: 'boolean', default: false, description: 'Use headless browser during crawl.' },
                        waitForSelector: { type: 'string', description: 'CSS selector to wait for on each page if useBrowser is true.' },
                        proxy: { type: 'string', description: 'Optional proxy URL for crawl requests.' },
                      },
                      required: ['startUrl'],
                    },
                  },
                  {
                    name: 'get_crawl_job_result',
                    description: 'Retrieves the status and results of a crawl job.',
                    inputSchema: {
                      type: 'object',
                      properties: {
                        jobId: { type: 'string', description: 'The ID of the crawl job to check.' },
                      },
                      required: ['jobId'],
                    },
                  },
              ];
            logger.info('Successfully prepared tools list.');
            return { tools: toolsList };
        } catch (error) {
            logger.error('Error occurred during ListTools handling:', error);
            // Re-throw or return an error structure if appropriate for MCP SDK
            throw error; // Or handle more gracefully
        }
    });

    // --- CallTool Handler ---
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      logger.info(`Received tool call: ${request.params.name}`);
      switch (request.params.name) {
        case 'scrape_url':
          if (!isValidScrapeUrlArgs(request.params.arguments)) {
            throw new McpError(ErrorCode.InvalidParams, 'Invalid arguments for scrape_url');
          }
          try {
            const args = request.params.arguments;
            const outputFormats = args.outputFormats ?? ['json'];
            const needsScreenshot = outputFormats.includes('screenshot');
            const useBrowser = args.useBrowser || needsScreenshot;

            logger.debug('scrape_url processing:', { url: args.url, formats: outputFormats, useBrowser });

            let htmlContent: string | undefined;

            // --- Fetch HTML ---
            if (useBrowser || outputFormats.includes('html') || outputFormats.includes('markdown') || outputFormats.includes('json')) {
                if (useBrowser) {
                    htmlContent = await BrowserService.scrapeWithBrowser(args.url, {
                        waitForSelector: args.waitForSelector,
                    });
                } else {
                    // TEMPORARY WORKAROUND: Re-fetch with httpClient. Needs improvement.
                    const response = await (await import('./utils/httpClient.js')).httpClient.get(args.url);
                    htmlContent = response.data;
                }
            }

            // --- Generate requested outputs ---
            const result: { [key: string]: any } = { url: args.url };

            if (outputFormats.includes('html') && htmlContent) {
                result.htmlContent = htmlContent;
            }

            if (outputFormats.includes('markdown') && htmlContent) {
                // Call statically if it's a static method, or via instance if not
                // Assuming MarkdownService was instantiated if needed
                 result.markdownData = MarkdownService.convertHtmlToMarkdown(htmlContent, args.url);
                 // If it's an instance method: result.markdownData = this.markdownService.convertHtmlToMarkdown(htmlContent, args.url);
            }

            if (outputFormats.includes('json') && htmlContent) {
                 const $ = cheerio.load(htmlContent); // Use static import
                 const title = $('title').text().trim();
                 // Use static imports
                 const mainContent = extractMainContent(htmlContent);
                 const metadata = extractMetadata($);
                 const links = extractLinks($);

                 if (args.selectors && Object.keys(args.selectors).length > 0) {
                     result.jsonData = { extracted: {} };
                     for (const key in args.selectors) {
                         result.jsonData.extracted[key] = $(args.selectors[key]).text().trim();
                     }
                 } else {
                    result.jsonData = {
                        title: title,
                        mainContent: mainContent,
                        metadata: metadata,
                        links: links,
                    };
                 }
            }

            if (needsScreenshot) {
                 if (!useBrowser && !htmlContent) { // Ensure browser ran if screenshot needed
                    logger.warn("Screenshot requested but browser wasn't used initially. Running browser now.");
                    htmlContent = await BrowserService.scrapeWithBrowser(args.url, { waitForSelector: args.waitForSelector });
                 }
                 const screenshotBuffer = await BrowserService.takeScreenshot(args.url, {
                     fullPage: true,
                     waitForSelector: args.waitForSelector,
                 });
                 result.screenshotBase64 = screenshotBuffer.toString('base64');
            }

            return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };

          } catch (error) {
            logger.error({ message: 'Failed to execute scrape_url', url: request.params.arguments?.url, error });
            throw new McpError(ErrorCode.InternalError, `Failed to scrape URL: ${error instanceof Error ? error.message : String(error)}`);
          }

        case 'start_crawl':
            if (!isValidStartCrawlArgs(request.params.arguments)) {
                throw new McpError(ErrorCode.InvalidParams, 'Invalid arguments for start_crawl');
            }
            try {
                logger.debug('start_crawl arguments:', request.params.arguments);
                const args = request.params.arguments;
                const jobOptions = {
                    maxDepth: args.maxDepth,
                    domainScope: args.domainScope,
                    useBrowser: args.useBrowser,
                    waitForSelector: args.waitForSelector,
                    proxy: args.proxy,
                    outputFormat: args.outputFormat ?? 'markdown',
                    includePatterns: args.includePatterns,
                    excludePatterns: args.excludePatterns,
                };

                const newJob = await prisma.crawlJob.create({
                  data: {
                    startUrl: args.startUrl,
                    status: 'pending',
                    options: JSON.stringify(jobOptions),
                  },
                });
                logger.info({ message: 'Created new crawl job', jobId: newJob.id });
                return { content: [{ type: 'text', text: JSON.stringify({ jobId: newJob.id }) }] };
            } catch (error) {
                logger.error({ message: 'Failed to create crawl job', error });
                throw new McpError(ErrorCode.InternalError, 'Failed to create crawl job');
            }

        case 'get_crawl_job_result':
            if (!isValidGetCrawlJobResultArgs(request.params.arguments)) {
                throw new McpError(ErrorCode.InvalidParams, 'Invalid arguments for get_crawl_job_result');
            }
            try {
                const jobId = request.params.arguments.jobId;
                logger.debug('get_crawl_job_result arguments:', request.params.arguments);
                const job = await prisma.crawlJob.findUnique({ where: { id: jobId } });

                if (!job) {
                    throw new McpError(ErrorCode.InvalidRequest, `Crawl job not found: ${jobId}`);
                }

                const jobOptions = job.options ? JSON.parse(job.options) : {};
                const outputFormat = jobOptions.outputFormat || 'markdown';

                let resultData: any = {
                    jobId: job.id,
                    status: job.status,
                    startUrl: job.startUrl,
                    processedUrls: job.processedUrls,
                    foundUrls: job.foundUrls,
                    startTime: job.startTime,
                    endTime: job.endTime,
                    error: job.error,
                    failedUrls: job.failedUrls ? JSON.parse(job.failedUrls) : [],
                };

                if (job.status === 'completed' || job.status === 'completed_with_errors') {
                    // Placeholder: Fetching related pages needs schema relation or alternative logic
                    const pages = await prisma.scrapedPage.findMany({
                        // where: { crawlJobId: jobId } // Needs schema change
                    });

                    if (outputFormat === 'markdown' || outputFormat === 'both') {
                        resultData.markdownData = pages.map(p => `# ${p.title || p.url}\n\n${p.markdownContent || ''}`).join('\n\n---\n\n') || "[No pages found or processed for this job]";
                    }
                    if (outputFormat === 'json' || outputFormat === 'both') {
                         resultData.jsonData = pages.map(p => ({
                             url: p.url,
                             title: p.title,
                         })) || [];
                    }
                }

                return { content: [{ type: 'text', text: JSON.stringify(resultData, null, 2) }] };
            } catch (error) {
                logger.error({ message: 'Failed to get crawl job result', jobId: request.params.arguments.jobId, error });
                if (error instanceof McpError) throw error;
                throw new McpError(ErrorCode.InternalError, 'Failed to retrieve crawl job result');
            }

        default:
          logger.warn(`Unknown tool called: ${request.params.name}`);
          throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${request.params.name}`);
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    logger.info('IceCrawl MCP server running on stdio');
  }
}

export async function startMcpServer() {
  try {
    const serverInstance = new IceCrawlMcpServer();
    await serverInstance.run();
  } catch (error) {
    logger.error('Failed to start IceCrawl MCP server:', error);
    process.exit(1);
  }
}

// Only auto-start if run directly, not when imported
if (require.main === module) {
  startMcpServer();
}

export { IceCrawlMcpServer };
