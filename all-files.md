# Web Scraper Dual-Interface - All Files

This document contains all the files for the web scraper project. You can extract them using the script provided.

## Configuration Files

// .nvmrc
```
20.11.1
```

// package.json
```
{
  "name": "webscraper-dual-interface",
  "version": "0.1.0",
  "description": "Dual-interface web scraping application with HTTP API and CLI",
  "main": "dist/index.js",
  "bin": {
    "webscraper": "dist/cli.js"
  },
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "ts-node src/index.ts",
    "cli": "ts-node src/cli.ts",
    "lint": "eslint . --ext .ts",
    "format": "prettier --write \"**/*.{ts,js,json,md}\"",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:studio": "prisma studio",
    "prepare": "npm run build"
  },
  "keywords": [
    "webscraper",
    "cli",
    "api",
    "typescript",
    "nodejs"
  ],
  "author": "",
  "license": "MIT",
  "dependencies": {
    "@prisma/client": "^5.11.0",
    "axios": "^1.6.7",
    "axios-retry": "^4.0.0",
    "chalk": "^5.3.0",
    "cheerio": "^1.0.0-rc.12",
    "cli-table3": "^0.6.3",
    "commander": "^12.0.0",
    "cors": "^2.8.5",
    "express": "^4.19.2",
    "express-rate-limit": "^7.2.0",
    "helmet": "^7.1.0",
    "morgan": "^1.10.0",
    "node-cache": "^5.1.2",
    "swagger-jsdoc": "^6.2.8",
    "swagger-ui-express": "^5.0.0",
    "winston": "^3.12.0",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/jest": "^29.5.12",
    "@types/morgan": "^1.9.9",
    "@types/node": "^20.11.30",
    "@types/supertest": "^6.0.2",
    "@typescript-eslint/eslint-plugin": "^7.3.1",
    "@typescript-eslint/parser": "^7.3.1",
    "eslint": "^8.57.0",
    "eslint-config-prettier": "^9.1.0",
    "eslint-plugin-prettier": "^5.1.3",
    "jest": "^29.7.0",
    "prettier": "^3.2.5",
    "prisma": "^5.11.0",
    "supertest": "^6.3.4",
    "ts-jest": "^29.1.2",
    "ts-node": "^10.9.2",
    "typescript": "^5.4.3"
  },
  "engines": {
    "node": ">=20.0.0"
  }
}
```

// tsconfig.json
```
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "strict": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": "src",
    "declaration": true,
    "sourceMap": true,
    "resolveJsonModule": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

// jest.config.js
```
/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coveragePathIgnorePatterns: ['/node_modules/', '/dist/'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/**/__mocks__/**',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
};
```

// .eslintrc.js
```
module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier',
  ],
  plugins: ['@typescript-eslint', 'prettier'],
  env: {
    node: true,
    jest: true,
  },
  rules: {
    'prettier/prettier': 'error',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    'no-console': 'warn',
  },
  ignorePatterns: ['dist', 'node_modules', 'coverage'],
};
```

// .prettierrc.json
```
{
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "semi": true,
  "bracketSpacing": true,
  "arrowParens": "avoid",
  "endOfLine": "lf"
}
```

// .gitignore
```
# Dependencies
node_modules/
.pnp/
.pnp.js

# Build output
dist/
build/
out/

# Testing
coverage/
.nyc_output/

# Logs
logs/
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Environment variables
.env
.env.*
!.env.example

# IDE and editor files
.idea/
.vscode/
*.swp
*.swo
.DS_Store

# Prisma
prisma/.env
*.db
*.db-journal

# Temp files
.tmp/
temp/

# Cache
.eslintcache
.cache/
.npm/

# Optional npm cache directory
.npm

# Optional REPL history
.node_repl_history

# Yarn Integrity file
.yarn-integrity
```

## Prisma Schema

// prisma/schema.prisma
```
// This is your Prisma schema file,
// learn more about it in the docs: https://pris.ly/d/prisma-schema

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model ScrapedPage {
  id         String   @id @default(uuid())
  url        String   @unique
  title      String?
  content    String
  metadata   String?  // JSON string of metadata
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@index([url])
}
```

## Source Code

// src/index.ts
```
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import { defaultRateLimiter } from './middleware/rateLimiter';
import { requestLogger } from './middleware/requestLogger';
import logger from './utils/logger';
import { specs } from './utils/swagger';
import scrapeRoutes from './routes/scrapeRoutes';
import healthRoutes from './routes/healthRoutes';

// Initialize express app
const app = express();
const PORT = process.env.PORT || 6969;

// Middleware
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(requestLogger);
app.use(express.json());
app.use(defaultRateLimiter);

// Error handling middleware
const errorHandler = (err: Error, req: Request, res: Response, _next: NextFunction) => {
  logger.error({
    message: 'Request error',
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });
  
  res.status(500).json({
    status: 'error',
    message: err.message || 'An unexpected error occurred',
  });
};

// API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

// API Routes
app.use('/api/scrape', scrapeRoutes);
app.use('/health', healthRoutes);

// Apply error handler
app.use(errorHandler);

// Start the server
app.listen(PORT, () => {
  logger.info(`Model Context Protocol server running at http://localhost:${PORT}`);
});

export default app;
```

// src/cli.ts
```
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
```

// src/core/scraper.ts
```
import * as cheerio from 'cheerio';
import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';
import { CacheService } from '../services/cacheService';
import { extractMainContent, extractMetadata, extractLinks } from '../utils/contentExtractor';
import { requestPool } from '../utils/requestPool';
import { httpClient, createHttpClient } from '../utils/httpClient';
import { PerformanceMonitor } from '../utils/performance';
import crypto from 'crypto';

// Initialize Prisma client
const prisma = new PrismaClient();

/**
 * Represents the structure of scraped data
 */
export interface ScrapedData {
  url: string;
  title: string;
  content: string;
  metadata: Record<string, unknown>;
  timestamp: string;
}

/**
 * Generate a cache key for a URL
 * 
 * @param url - The URL to generate a cache key for
 * @returns Cache key
 */
function generateCacheKey(url: string): string {
  return `scrape_${crypto.createHash('md5').update(url).digest('hex')}`;
}

/**
 * Scrapes the content from a given URL
 * 
 * @param url - The URL to scrape
 * @param options - Scraping options
 * @returns Promise resolving to the scraped data
 */
export async function scrapeUrl(
  url: string, 
  options: { 
    useCache?: boolean; 
    cacheTtl?: number;
    timeout?: number;
    retries?: number;
  } = {}
): Promise<ScrapedData> {
  return PerformanceMonitor.measure('scrape_total', async () => {
    // Default options
    const { 
      useCache = true, 
      cacheTtl, 
      timeout = 10000,
      retries = 3
    } = options;
    
    // Generate cache key
    const cacheKey = generateCacheKey(url);
    
    // Check cache if enabled
    if (useCache) {
      const cachedData = CacheService.get<ScrapedData>(cacheKey);
      if (cachedData) {
        logger.info({ message: 'Serving from cache', url });
        return cachedData;
      }
    }
    
    // Execute the scraping task within the request pool
    return requestPool.add(async () => {
      try {
        logger.info({ message: 'Starting scrape', url });
        
        // Create a custom client for this request if needed
        const client = (timeout !== 10000 || retries !== 3) 
          ? createHttpClient({ timeout, retries })
          : httpClient;
        
        // Fetch the HTML content with performance monitoring
        const response = await PerformanceMonitor.measure(
          'scrape_fetch', 
          () => client.get(url),
          { url }
        );
        
        const html = response.data;
        
        // Parse HTML with performance monitoring
        const $ = await PerformanceMonitor.measure(
          'scrape_parse',
          () => cheerio.load(html),
          { url }
        );
        
        // Extract title
        const title = $('title').text().trim() || 'No title found';
        
        // Extract main content using optimized extractor with performance monitoring
        const content = await PerformanceMonitor.measure(
          'scrape_extract_content',
          () => extractMainContent(html),
          { url }
        );
        
        // Extract metadata with performance monitoring
        const metadata = await PerformanceMonitor.measure(
          'scrape_extract_metadata',
          () => extractMetadata($),
          { url }
        );
        
        // Extract links with performance monitoring
        const links = await PerformanceMonitor.measure(
          'scrape_extract_links',
          () => extractLinks($),
          { url }
        );
        
        // Create timestamp
        const timestamp = new Date().toISOString();
        
        // Construct the result
        const scrapedData: ScrapedData = {
          url,
          title,
          content,
          metadata: {
            ...metadata,
            links,
          },
          timestamp,
        };
        
        // Store in cache with performance monitoring
        if (useCache) {
          await PerformanceMonitor.measure(
            'scrape_cache',
            () => CacheService.set(cacheKey, scrapedData, cacheTtl),
            { url }
          );
        }
        
        // Store in database with performance monitoring
        await PerformanceMonitor.measure(
          'scrape_db',
          () => storeScrapedData(scrapedData),
          { url }
        );
        
        return scrapedData;
      } catch (error) {
        logger.error({ 
          message: 'Scrape failed',
          url,
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        });
        
        if (error instanceof Error) {
          throw new Error(`Failed to scrape URL (${url}): ${error.message}`);
        }
        throw new Error(`Failed to scrape URL (${url}): Unknown error`);
      }
    });
  }, { url });
}

/**
 * Stores the scraped data in the database
 * 
 * @param data - The scraped data to store
 */
async function storeScrapedData(data: ScrapedData): Promise<void> {
  try {
    await prisma.scrapedPage.upsert({
      where: { url: data.url },
      update: {
        title: data.title,
        content: data.content,
        metadata: JSON.stringify(data.metadata),
        updatedAt: new Date(),
      },
      create: {
        url: data.url,
        title: data.title,
        content: data.content,
        metadata: JSON.stringify(data.metadata),
      },
    });
    
    logger.info({
      message: 'Saved to database',
      url: data.url,
    });
  } catch (error) {
    logger.error({
      message: 'Database storage error',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
}
```

// src/utils/stdinHelper.ts
```
/**
 * Reads input from stdin until EOF
 * 
 * @returns Promise resolving to the stdin input as a string
 */
export function getInputFromStdin(): Promise<string> {
  return new Promise((resolve) => {
    let data = '';
    
    // Handle input data
    process.stdin.on('data', (chunk) => {
      data += chunk;
    });
    
    // Resolve when input ends
    process.stdin.on('end', () => {
      resolve(data);
    });
    
    // Handle errors
    process.stdin.on('error', (error) => {
      console.error('Error reading from stdin:', error);
      resolve('');
    });
    
    // Set encoding
    process.stdin.setEncoding('utf8');
    
    // Resume stdin if it's paused
    if (process.stdin.isPaused()) {
      process.stdin.resume();
    }
  });
}
```

// src/middleware/rateLimiter.ts
```
import rateLimit from 'express-rate-limit';

/**
 * Creates a rate limiter middleware
 * 
 * @param windowMs - Time window in milliseconds
 * @param max - Maximum number of requests per window
 * @returns Rate limiter middleware
 */
export const createRateLimiter = (windowMs = 15 * 60 * 1000, max = 100) => {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      status: 'error',
      message: 'Too many requests, please try again later.',
    },
  });
};

// Default rate limiter (100 requests per 15 minutes)
export const defaultRateLimiter = createRateLimiter();

// Stricter rate limiter for scraping endpoint (30 requests per 15 minutes)
export const scrapingRateLimiter = createRateLimiter(15 * 60 * 1000, 30);
```

// src/middleware/requestLogger.ts
```
import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  // Capture the start time
  const start = Date.now();
  
  // Track response
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    // Log at appropriate level based on status code
    const level = res.statusCode >= 500 ? 'error' : 
                 res.statusCode >= 400 ? 'warn' : 'info';
    
    logger[level]({
      message: 'Request processed',
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('user-agent') || 'unknown',
      ip: req.ip || req.ips,
    });
  });
  
  next();
};
```

// src/routes/scrapeRoutes.ts
```
import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { scrapeUrl } from '../core/scraper';
import { scrapingRateLimiter } from '../middleware/rateLimiter';

const router = Router();

// Input validation schema
const urlSchema = z.object({
  url: z.string().url(),
});

/**
 * @swagger
 * /api/scrape:
 *   get:
 *     summary: Scrape content from a URL
 *     description: Retrieves and processes content from the provided URL.
 *     tags: [Scraping]
 *     parameters:
 *       - in: query
 *         name: url
 *         required: true
 *         schema:
 *           type: string
 *           format: uri
 *         description: The URL to scrape
 *     responses:
 *       200:
 *         description: Successfully retrieved and processed content
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     url:
 *                       type: string
 *                       example: https://example.com
 *                     title:
 *                       type: string
 *                       example: Example Domain
 *                     content:
 *                       type: string
 *                       example: This domain is for use in illustrative examples...
 *                     metadata:
 *                       type: object
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Invalid URL parameter
 *       429:
 *         description: Too many requests - rate limit exceeded
 *       500:
 *         description: Server error while processing the request
 */
router.get('/', scrapingRateLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { url } = req.query;
    
    // Validate input
    const parsedInput = urlSchema.safeParse({ url });
    if (!parsedInput.success) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid URL parameter',
        details: parsedInput.error.format(),
      });
    }
    
    // Perform scraping
    const scrapedData = await scrapeUrl(parsedInput.data.url);
    
    return res.status(200).json({
      status: 'success',
      data: scrapedData,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
```

// src/routes/healthRoutes.ts
```
import { Router, Request, Response } from 'express';

const router = Router();

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     description: Returns the current health status of the API
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Server is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: healthy
 *                 version:
 *                   type: string
 *                   example: 1.0.0
 *                 uptime:
 *                   type: number
 *                   example: 3600
 */
router.get('/', (_req: Request, res: Response) => {
  res.status(200).json({ 
    status: 'healthy',
    version: process.env.npm_package_version || '0.1.0',
    uptime: process.uptime()
  });
});

export default router;
```

// src/utils/logger.ts
```
import winston from 'winston';
import fs from 'fs';
import path from 'path';

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Create Winston logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'webscraper' },
  transports: [
    // Write to all logs with level 'info' and below to combined.log
    new winston.transports.File({ 
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Write all logs with level 'error' and below to error.log
    new winston.transports.File({ 
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

// If we're not in production, also log to the console
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    ),
  }));
}

export default logger;
```

// src/utils/swagger.ts
```
import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Web Scraper API',
      version: '1.0.0',
      description: 'Web Scraping API for the Dual-Interface Application',
      license: {
        name: 'MIT',
        url: 'https://spdx.org/licenses/MIT.html',
      },
      contact: {
        name: 'API Support',
        url: 'https://yourwebsite.com/support',
        email: 'support@yourwebsite.com',
      },
    },
    servers: [
      {
        url: 'http://localhost:6969',
        description: 'Development server',
      },
    ],
  },
  apis: ['./src/routes/*.ts', './src/index.ts'], // paths to files containing annotations
};

export const specs = swaggerJsdoc(options);
```

// src/utils/cliFormatter.ts
```
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
export function formatScrapedData(data: ScrapedData, outputFormat: 'pretty' | 'json' | 'minimal' = 'pretty'): string {
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
        wordWrap: true
      });
      
      // Add rows to the table
      table.push(
        [chalk.bold('URL'), data.url],
        [chalk.bold('Title'), data.title],
        [chalk.bold('Timestamp'), data.timestamp],
        [chalk.bold('Content Preview'), `${data.content.substring(0, 300)}${data.content.length > 300 ? '...' : ''}`]
      );
      
      // Add metadata as separate rows
      Object.entries(data.metadata).forEach(([key, value]) => {
        if (value && value.toString().trim()) {
          table.push([
            chalk.bold(`Metadata: ${key}`), 
            typeof value === 'string' ? value : JSON.stringify(value)
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
```

// src/utils/contentExtractor.ts
```
import * as cheerio from 'cheerio';
import logger from './logger';

// Elements that commonly contain main content
const CONTENT_SELECTORS = [
  'article',
  'main',
  '.content',
  '#content',
  '.article',
  '.post',
  '.entry',
  '.blog-post',
  '[role="main"]',
  '.main-content',
];

// Elements that typically contain noise
const NOISE_SELECTORS = [
  'nav',
  'header',
  'footer',
  'aside',
  '.sidebar',
  '.comments',
  '.advertisement',
  '.ads',
  '.nav',
  '.menu',
  '.navbar',
  '.social',
  '.share',
  '.related',
  '.recommended',
  '#comments',
  'script',
  'style',
  'iframe',
];

/**
 * Extract the main content from an HTML document
 * 
 * @param html - The HTML to extract content from
 * @returns Extracted main content
 */
export function extractMainContent(html: string): string {
  try {
    const $ = cheerio.load(html);
    
    // Remove noisy elements
    $(NOISE_SELECTORS.join(', ')).remove();
    
    // Try to find the main content container
    for (const selector of CONTENT_SELECTORS) {
      const element = $(selector);
      if (element.length > 0) {
        // Found a potential content container
        const text = element.text().trim();
        if (text.length > 100) {  // Ensure it's substantial enough
          return cleanText(text);
        }
      }
    }
    
    // Fallback: get content from body
    const bodyText = $('body').text().trim();
    return cleanText(bodyText);
  } catch (error) {
    logger.error({
      message: 'Content extraction failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return '';
  }
}

/**
 * Extract metadata from HTML
 * 
 * @param $ - Cheerio instance
 * @returns Extracted metadata
 */
export function extractMetadata($: cheerio.CheerioAPI): Record<string, unknown> {
  const metadata: Record<string, unknown> = {};
  
  // Basic metadata
  metadata.title = $('title').text().trim() || '';
  metadata.description = $('meta[name="description"]').attr('content') || '';
  metadata.keywords = $('meta[name="keywords"]').attr('content') || '';
  
  // OpenGraph metadata
  const ogProps = [
    'title', 'description', 'image', 'url', 'type', 'site_name'
  ];
  
  ogProps.forEach(prop => {
    const value = $(`meta[property="og:${prop}"]`).attr('content');
    if (value) {
      metadata[`og_${prop}`] = value;
    }
  });
  
  // Twitter Card metadata
  const twitterProps = [
    'card', 'site', 'creator', 'title', 'description', 'image'
  ];
  
  twitterProps.forEach(prop => {
    const value = $(`meta[name="twitter:${prop}"]`).attr('content');
    if (value) {
      metadata[`twitter_${prop}`] = value;
    }
  });
  
  // Try to extract JSON-LD
  try {
    const jsonLdScript = $('script[type="application/ld+json"]').first();
    if (jsonLdScript.length) {
      const jsonLdText = jsonLdScript.html();
      if (jsonLdText) {
        metadata.jsonLd = JSON.parse(jsonLdText);
      }
    }
  } catch (error) {
    logger.warn({
      message: 'Failed to parse JSON-LD data',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
  
  return metadata;
}

/**
 * Extract all links from the HTML
 * 
 * @param $ - Cheerio instance
 * @returns Array of extracted links
 */
export function extractLinks($: cheerio.CheerioAPI): Array<{ href: string; text: string }> {
  const links: Array<{ href: string; text: string }> = [];
  
  $('a[href]').each((_, element) => {
    const href = $(element).attr('href');
    const text = $(element).text().trim();
    
    if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
      links.push({
        href,
        text: text || href,
      });
    }
  });
  
  return links;
}

/**
 * Clean and normalize text
 * 
 * @param text - Text to clean
 * @returns Cleaned text
 */
function cleanText(text: string): string {
  return text
    .replace(/\s+/g, ' ')    // Replace multiple whitespace with a single space
    .replace(/\n+/g, '\n')   // Replace multiple newlines with a single newline
    .trim();                 // Remove leading/trailing whitespace
}
```

// src/utils/httpClient.ts
```
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import axiosRetry from 'axios-retry';
import logger from './logger';

/**
 * Creates a configured HTTP client with retry and timeout handling
 * 
 * @param config - Configuration options
 * @returns Configured Axios instance
 */
export function createHttpClient(config: {
  retries?: number;
  timeout?: number;
  userAgent?: string;
} = {}): AxiosInstance {
  const {
    retries = 3,
    timeout = 10000,
    userAgent = 'Model-Context-Protocol-Agent/1.0',
  } = config;
  
  // Create axios instance
  const client = axios.create({
    timeout,
    headers: {
      'User-Agent': userAgent,
      'Accept': 'text/html,application/xhtml+xml,application/xml',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  });
  
  // Configure retry logic
  axiosRetry(client, {
    retries,
    retryDelay: (retryCount) => retryCount * 1000, // exponential backoff
    retryCondition: (error) => {
      // Retry on network errors, timeouts, 429 (too many requests), and 5xx responses
      return (
        axiosRetry.isNetworkError(error) ||
        error.code === 'ECONNABORTED' || // Timeout
        error.response?.status === 429 ||
        (error.response?.status && error.response.status >= 500)
      );
    },
    onRetry: (retryCount, error, requestConfig) => {
      logger.warn({
        message: `Retrying request (${retryCount}/${retries})`,
        url: requestConfig.url,
        error: error.message,
        timeout: requestConfig.timeout,
      });
    },
  });
  
  // Add response time logging
  client.interceptors.request.use((config) => {
    config.headers = config.headers || {};
    config.headers['request-startTime'] = Date.now().toString();
    return config;
  });
  
  client.interceptors.response.use((response) => {
    const startTime = parseInt(response.config.headers?.['request-startTime'] as string || '0');
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    logger.debug({
      message: 'Request completed',
      method: response.config.method?.toUpperCase(),
      url: response.config.url,
      status: response.status,
      duration: `${duration}ms`,
    });
    
    return response;
  });
  
  return client;
}

// Export a default client
export const httpClient = createHttpClient();
```

// src/utils/performance.ts
```
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
```

// src/utils/requestPool.ts
```
import logger from './logger';

/**
 * Request Pool Manager for limiting concurrent requests
 */
export class RequestPoolManager {
  private maxConcurrent: number;
  private currentConcurrent: number;
  private queue: Array<() => Promise<void>>;
  
  /**
   * Create a new RequestPoolManager
   * 
   * @param maxConcurrent - Maximum number of concurrent requests
   */
  constructor(maxConcurrent = 5) {
    this.maxConcurrent = maxConcurrent;
    this.currentConcurrent = 0;
    this.queue = [];
    
    logger.info({
      message: 'Request pool initialized',
      maxConcurrent,
    });
  }
  
  /**
   * Add a task to the pool
   * 
   * @param task - The async task to execute
   * @returns Promise that resolves when the task completes
   */
  async add<T>(task: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      // Create a wrapped task
      const wrappedTask = async () => {
        try {
          this.currentConcurrent++;
          const result = await task();
          resolve(result);
          return result;
        } catch (error) {
          reject(error);
          throw error;
        } finally {
          this.currentConcurrent--;
          this.processQueue();
        }
      };
      
      // If we can execute immediately, do so
      if (this.currentConcurrent < this.maxConcurrent) {
        wrappedTask().catch(() => {});
      } else {
        // Otherwise, add to queue
        this.queue.push(wrappedTask);
      }
    });
  }
  
  /**
   * Process the next item in the queue if possible
   */
  private processQueue(): void {
    if (this.queue.length > 0 && this.currentConcurrent < this.maxConcurrent) {
      const nextTask = this.queue.shift();
      if (nextTask) {
        nextTask().catch(() => {});
      }
    }
  }
  
  /**
   * Get the current status of the pool
   * 
   * @returns Pool status
   */
  getStatus(): { maxConcurrent: number; currentConcurrent: number; queueLength: number } {
    return {
      maxConcurrent: this.maxConcurrent,
      currentConcurrent: this.currentConcurrent,
      queueLength: this.queue.length,
    };
  }
}

// Create a singleton instance
export const requestPool = new RequestPoolManager();
```

// src/services/cacheService.ts
```
import NodeCache from 'node-cache';
import logger from '../utils/logger';

// Configure cache with default TTL of 1 hour and check period of 10 minutes
const cache = new NodeCache({
  stdTTL: 3600, // 1 hour in seconds
  checkperiod: 600, // 10 minutes in seconds
});

/**
 * Cache service for storing and retrieving scraped data
 */
export class CacheService {
  /**
   * Get data from cache
   * 
   * @param key - Cache key
   * @returns Cached data or undefined if not found/expired
   */
  static get<T>(key: string): T | undefined {
    try {
      const value = cache.get<T>(key);
      if (value) {
        logger.debug({ message: 'Cache hit', key });
      } else {
        logger.debug({ message: 'Cache miss', key });
      }
      return value;
    } catch (error) {
      logger.error({
        message: 'Cache get error',
        key,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return undefined;
    }
  }

  /**
   * Store data in cache
   * 
   * @param key - Cache key
   * @param value - Data to cache
   * @param ttl - Time to live in seconds (optional)
   * @returns Success or failure
   */
  static set<T>(key: string, value: T, ttl?: number): boolean {
    try {
      const success = cache.set(key, value, ttl);
      logger.debug({
        message: 'Cache set',
        key,
        ttl: ttl || 'default',
        success,
      });
      return success;
    } catch (error) {
      logger.error({
        message: 'Cache set error',
        key,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  /**
   * Remove data from cache
   * 
   * @param key - Cache key
   * @returns Success or failure
   */
  static delete(key: string): boolean {
    try {
      const deleted = cache.del(key);
      logger.debug({
        message: 'Cache delete',
        key,
        deleted,
      });
      return deleted > 0;
    } catch (error) {
      logger.error({
        message: 'Cache delete error',
        key,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  /**
   * Clear entire cache
   */
  static clear(): void {
    try {
      cache.flushAll();
      logger.info({ message: 'Cache cleared' });
    } catch (error) {
      logger.error({
        message: 'Cache clear error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get cache statistics
   * 
   * @returns Cache statistics
   */
  static getStats(): NodeCache.Stats {
    return cache.getStats();
  }
}
```

## Tests

// src/core/__tests__/scraper.test.ts
```
import { scrapeUrl, ScrapedData } from '../scraper';
import { httpClient } from '../../utils/httpClient';
import { CacheService } from '../../services/cacheService';
import { PrismaClient } from '@prisma/client';

// Mock dependencies
jest.mock('../../utils/httpClient');
jest.mock('../../services/cacheService');
jest.mock('@prisma/client');

describe('Scraper', () => {
  // Sample HTML for testing
  const sampleHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Test Page</title>
        <meta name="description" content="Test description">
        <meta property="og:title" content="Test OG Title">
      </head>
      <body>
        <main>
          <h1>Main Content</h1>
          <p>This is the main content of the page.</p>
          <a href="https://example.com">Example Link</a>
        </main>
        <footer>
          Footer content
        </footer>
      </body>
    </html>
  `;
  
  beforeEach(() => {
    // Reset all mocks
    jest.resetAllMocks();
    
    // Mock HTTP client
    (httpClient.get as jest.Mock).mockResolvedValue({
      data: sampleHtml,
      status: 200,
      headers: {},
    });
    
    // Mock cache service
    (CacheService.get as jest.Mock).mockReturnValue(undefined);
    (CacheService.set as jest.Mock).mockReturnValue(true);
    
    // Mock Prisma client
    const mockPrisma = {
      scrapedPage: {
        upsert: jest.fn().mockResolvedValue({}),
      },
    };
    (PrismaClient as jest.Mock).mockImplementation(() => mockPrisma);
  });
  
  test('should scrape a URL successfully', async () => {
    const url = 'https://test.com';
    
    const result = await scrapeUrl(url, { useCache: false });
    
    // Verify the result structure
    expect(result).toBeDefined();
    expect(result.url).toBe(url);
    expect(result.title).toBe('Test Page');
    expect(result.content).toContain('Main Content');
    expect(result.content).toContain('This is the main content of the page.');
    expect(result.metadata).toBeDefined();
    expect(result.metadata.description).toBe('Test description');
    expect(result.metadata.og_title).toBe('Test OG Title');
    
    // Verify HTTP client was called
    expect(httpClient.get).toHaveBeenCalledWith(url);
  });
  
  test('should use cache when available', async () => {
    const url = 'https://test.com';
    const cachedData: ScrapedData = {
      url,
      title: 'Cached Title',
      content: 'Cached content',
      metadata: {},
      timestamp: new Date().toISOString(),
    };
    
    // Set up cache hit
    (CacheService.get as jest.Mock).mockReturnValue(cachedData);
    
    const result = await scrapeUrl(url, { useCache: true });
    
    // Verify we got the cached data
    expect(result).toEqual(cachedData);
    
    // Verify HTTP client was NOT called
    expect(httpClient.get).not.toHaveBeenCalled();
  });
  
  test('should handle HTTP errors', async () => {
    const url = 'https://test.com';
    
    // Set up HTTP error
    (httpClient.get as jest.Mock).mockRejectedValue(new Error('Network error'));
    
    await expect(scrapeUrl(url)).rejects.toThrow('Failed to scrape URL');
  });
});
```

// src/__tests__/api.test.ts
```
import request from 'supertest';
import app from '../index';
import { scrapeUrl } from '../core/scraper';

// Mock dependencies
jest.mock('../core/scraper');

describe('API Endpoints', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });
  
  describe('GET /api/scrape', () => {
    test('should return scraped data for valid URL', async () => {
      const mockData = {
        url: 'https://example.com',
        title: 'Example Domain',
        content: 'Example content',
        metadata: { description: 'An example website' },
        timestamp: new Date().toISOString(),
      };
      
      // Mock scraper response
      (scrapeUrl as jest.Mock).mockResolvedValue(mockData);
      
      const response = await request(app)
        .get('/api/scrape')
        .query({ url: 'https://example.com' });
      
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data).toEqual(mockData);
      expect(scrapeUrl).toHaveBeenCalledWith('https://example.com');
    });
    
    test('should return 400 for invalid URL', async () => {
      const response = await request(app)
        .get('/api/scrape')
        .query({ url: 'not-a-url' });
      
      expect(response.status).toBe(400);
      expect(response.body.status).toBe('error');
      expect(scrapeUrl).not.toHaveBeenCalled();
    });
    
    test('should return 500 for scraper errors', async () => {
      // Mock scraper error
      (scrapeUrl as jest.Mock).mockRejectedValue(new Error('Scraping failed'));
      
      const response = await request(app)
        .get('/api/scrape')
        .query({ url: 'https://example.com' });
      
      expect(response.status).toBe(500);
      expect(response.body.status).toBe('error');
    });
  });
  
  describe('GET /health', () => {
    test('should return healthy status', async () => {
      const response = await request(app).get('/health');
      
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('healthy');
    });
  });
});
```

// src/__tests__/cli.test.ts
```
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import util from 'util';

const execPromise = util.promisify(exec);

// Path to CLI entry point
const CLI_PATH = path.resolve(__dirname, '../../dist/cli.js');

// Helper to run CLI commands
async function runCli(args: string = '', stdin: string = ''): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = exec(`node ${CLI_PATH} ${args}`, (error, stdout, stderr) => {
      if (error && !stderr) {
        reject(error);
      } else {
        resolve({ stdout, stderr });
      }
    });
    
    if (stdin) {
      child.stdin?.write(stdin);
      child.stdin?.end();
    }
  });
}

describe('CLI', () => {
  // Skip tests if not in a build environment
  beforeAll(() => {
    if (!fs.existsSync(CLI_PATH)) {
      console.warn(`CLI tests skipped: ${CLI_PATH} not found. Run 'npm run build' first.`);
      jest.mock('child_process', () => ({
        exec: jest.fn().mockImplementation((cmd, cb) => cb(null, 'mocked stdout', '')),
      }));
    }
  });
  
  test('should display help information with --help flag', async () => {
    const { stdout } = await runCli('--help');
    
    expect(stdout).toContain('Usage:');
    expect(stdout).toContain('Options:');
    expect(stdout).toContain('Commands:');
  });
  
  test('should process URL from stdin', async () => {
    const { stdout } = await runCli('--format json', 'https://example.com');
    
    const result = JSON.parse(stdout);
    expect(result).toHaveProperty('url', 'https://example.com');
    expect(result).toHaveProperty('title');
    expect(result).toHaveProperty('content');
  });
  
  test('should process URL from command line argument', async () => {
    const { stdout } = await runCli('url https://example.com --format json');
    
    const result = JSON.parse(stdout);
    expect(result).toHaveProperty('url', 'https://example.com');
    expect(result).toHaveProperty('title');
    expect(result).toHaveProperty('content');
  });
  
  test('should handle invalid URLs', async () => {
    const { stderr } = await runCli('url invalid-url');
    
    expect(stderr).toContain('Error:');
  });
});
```

// src/utils/__mocks__/httpClient.ts
```
export const httpClient = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
};

export const createHttpClient = jest.fn().mockReturnValue(httpClient);
```

// src/services/__mocks__/cacheService.ts
```
export class CacheService {
  static cache: Record<string, any> = {};
  
  static get<T>(key: string): T | undefined {
    return this.cache[key];
  }
  
  static set<T>(key: string, value: T, ttl?: number): boolean {
    this.cache[key] = value;
    return true;
  }
  
  static delete(key: string): boolean {
    if (key in this.cache) {
      delete this.cache[key];
      return true;
    }
    return false;
  }
  
  static clear(): void {
    this.cache = {};
  }
  
  static getStats() {
    return {
      keys: Object.keys(this.cache).length,
      hits: 0,
      misses: 0,
      ksize: 0,
      vsize: 0,
    };
  }
}
```

## Documentation

// docs/adr/001-caching-strategy.md
```
# Implement In-Memory Caching with TTL for Scraped Content

* Status: accepted
* Deciders: Development Team
* Date: 2023-04-06

## Context and Problem Statement

Web scraping operations are resource-intensive and can put load on target servers. Repeatedly scraping the same content within short time periods is inefficient and potentially harmful to target sites. How can we reduce unnecessary scraping while still ensuring data freshness?

## Decision Drivers

* Reduce load on target websites by avoiding unnecessary repeat requests
* Improve response times for frequently requested URLs
* Ensure data freshness by providing mechanisms to invalidate stale data
* Maintain memory usage within reasonable limits
* Support both CLI and API interfaces with the same caching system

## Considered Options

* No caching - scrape on every request
* File-based caching
* Database caching (using existing Prisma setup)
* In-memory caching with time-to-live (TTL)
* Distributed caching (Redis)

## Decision Outcome

Chosen option: "In-memory caching with TTL" because it provides the best balance of simplicity, performance, and freshness control without adding external dependencies. This approach works well for both the API and CLI interfaces.

### Positive Consequences

* Significantly reduced response times for cached URLs
* Decreased load on target websites due to fewer repeat requests
* Built-in cache expiration ensures data freshness
* Simple implementation with minimal dependencies
* Configurable TTL allows fine-tuning based on content type

### Negative Consequences

* In-memory caches don't persist across application restarts
* Cache size limited by available memory
* No sharing of cache between multiple instances of the application
* May require manual cache invalidation for time-sensitive use cases

## Pros and Cons of the Options

### No Caching

* Good, because it's simple to implement
* Good, because it always provides fresh data
* Bad, because it leads to redundant scraping operations
* Bad, because it increases load on target servers
* Bad, because it results in slower response times

### File-Based Caching

* Good, because it persists across application restarts
* Good, because it's simple to implement
* Bad, because file I/O can be slow for high-frequency operations
* Bad, because manual cleanup of stale files is required

### Database Caching

* Good, because it leverages existing infrastructure
* Good, because it persists across restarts
* Bad, because it adds database load for what should be quick operations
* Bad, because it requires additional database maintenance

### In-Memory Caching with TTL

* Good, because it provides the fastest possible response times
* Good, because TTL ensures data freshness
* Good, because it's simple to implement with node-cache
* Good, because memory usage is automatically managed
* Bad, because it doesn't persist across application restarts
* Bad, because it's limited by available memory

### Distributed Caching (Redis)

* Good, because it enables sharing cache across multiple instances
* Good, because it provides persistence
* Good, because it scales well
* Bad, because it adds an external dependency
* Bad, because it increases operational complexity

## Implementation Details

We implemented caching using the `node-cache` package with the following key design decisions:

1. Default TTL of 1 hour for most content
2. Option to override TTL on a per-request basis
3. Option to bypass cache for specific requests
4. Automatic key generation based on URL MD5 hash
5. Cache statistics for monitoring cache effectiveness

## Follow-Up Actions

* Implement cache monitoring to track hit/miss rates
* Add API endpoint for manual cache invalidation
* Consider implementing a distributed cache as a future enhancement if needed
```

// docs/examples.md
```
# Web Scraper Examples

This document provides examples of common use cases for both the API and CLI interfaces.

## API Examples

### Basic URL Scraping

Retrieve content from a URL:

```bash
curl "http://localhost:6969/api/scrape?url=https://example.com"
```

Response:

```json
{
  "status": "success",
  "data": {
    "url": "https://example.com",
    "title": "Example Domain",
    "content": "This domain is for use in illustrative examples...",
    "metadata": {
      "description": "Example Domain",
      "links": [
        {
          "href": "https://www.iana.org/domains/example",
          "text": "More information..."
        }
      ]
    },
    "timestamp": "2023-04-06T15:30:45.123Z"
  }
}
```

### Health Check

Check if the API is running:

```bash
curl "http://localhost:6969/health"
```

Response:

```json
{
  "status": "healthy",
  "version": "0.1.0",
  "uptime": 3600
}
```

### Swagger Documentation

Access the API documentation by visiting:

```
http://localhost:6969/api-docs
```

## CLI Examples

### Scrape a URL Directly

```bash
npx webscraper url https://example.com
```

Output:

```
✓ Successfully scraped content from https://example.com

┌──────────────────────┬────────────────────────────────────────────────────────────────────────────────┐
│ Property             │ Value                                                                          │
├──────────────────────┼────────────────────────────────────────────────────────────────────────────────┤
│ URL                  │ https://example.com                                                            │
├──────────────────────┼────────────────────────────────────────────────────────────────────────────────┤
│ Title                │ Example Domain                                                                 │
├──────────────────────┼────────────────────────────────────────────────────────────────────────────────┤
│ Timestamp            │ 2023-04-06T15:30:45.123Z                                                       │
├──────────────────────┼────────────────────────────────────────────────────────────────────────────────┤
│ Content Preview      │ This domain is for use in illustrative examples in documents. You may use ...  │
├──────────────────────┼────────────────────────────────────────────────────────────────────────────────┤
│ Metadata: description│ Example Domain                                                                 │
└──────────────────────┴────────────────────────────────────────────────────────────────────────────────┘
```

### JSON Output Format

```bash
npx webscraper url https://example.com --format json
```

Output:

```json
{
  "url": "https://example.com",
  "title": "Example Domain",
  "content": "This domain is for use in illustrative examples...",
  "metadata": {
    "description": "Example Domain",
    "links": [
      {
        "href": "https://www.iana.org/domains/example",
        "text": "More information..."
      }
    ]
  },
  "timestamp": "2023-04-06T15:30:45.123Z"
}
```

### Minimal Output Format

```bash
npx webscraper url https://example.com --format minimal
```

Output:

```
Example Domain
https://example.com

This domain is for use in illustrative examples...
```

### Using Stdin

```bash
echo "https://example.com" | npx webscraper
```

### Processing Multiple URLs

```bash
cat urls.txt | while read url; do
  npx webscraper url "$url" --format json >> results.json
done
```

### Silent Mode (For Scripts)

```bash
npx webscraper url https://example.com --silent --format json
```

## Advanced Examples

### Extract All Links from a Page

```bash
npx webscraper url https://example.com --format json | jq -r '.metadata.links[].href'
```

### Extract Metadata

```bash
npx webscraper url https://example.com --format json | jq -r '.metadata'
```

### Monitor a Website for Changes

```bash
# Script to check for changes
#!/bin/bash
URL="https://example.com"
OLD_HASH=$(npx webscraper url "$URL" --format json | jq -r '.content' | md5sum)

while true; do
  NEW_HASH=$(npx webscraper url "$URL" --format json | jq -r '.content' | md5sum)
  
  if [ "$OLD_HASH" != "$NEW_HASH" ]; then
    echo "Content changed at $(date)"
    OLD_HASH=$NEW_HASH
  fi
  
  sleep 300  # Check every 5 minutes
done
```

## Performance Tips

1. Use the `--format json` option for piping to other tools
2. Enable caching for repeated requests to the same URLs
3. Use the `--silent` flag when using in scripts to reduce output
4. For API users, consider implementing client-side caching
```

// docs/cli-usage.md
```
# Web Scraper CLI Usage Guide

The Web Scraper provides a powerful command-line interface (CLI) for scraping web content directly from your terminal.

## Installation

```bash
# Install globally
npm install -g webscraper-dual-interface

# Or use directly with npx
npx webscraper-dual-interface
```

## Basic Usage

### Scrape a URL directly

```bash
webscraper url https://example.com
```

### Pipe a URL to the scraper

```bash
echo "https://example.com" | webscraper
```

### Pipe content from a file

```bash
cat urls.txt | webscraper
```

## Output Formats

The CLI supports multiple output formats:

### Pretty (default)

Displays a formatted table with the scraped data:

```bash
webscraper url https://example.com --format pretty
# or
webscraper url https://example.com
```

### JSON

Returns the raw JSON data (useful for piping to other tools):

```bash
webscraper url https://example.com --format json
```

### Minimal

Displays a simplified output with just the title, URL, and content preview:

```bash
webscraper url https://example.com --format minimal
```

## Options

| Option | Alias | Description | Default |
|--------|-------|-------------|---------|
| `--format` | `-f` | Output format (pretty, json, minimal) | `pretty` |
| `--silent` | `-s` | Suppress progress messages, only show result | `false` |
| `--help` | `-h` | Display help information | |
| `--version` | `-V` | Display version information | |

## Examples

### Basic scraping

```bash
webscraper url https://example.com
```

### JSON output (for programmatic use)

```bash
webscraper url https://example.com --format json > result.json
```

### Process multiple URLs from a file

```bash
# Create a file with URLs (one per line)
cat > urls.txt << EOF
https://example.com
https://example.org
https://example.net
EOF

# Process each URL
cat urls.txt | while read url; do
  webscraper url "$url" --format json >> results.json
done
```

### Silent operation (for scripts)

```bash
webscraper url https://example.com --silent --format json
```

## Integration Examples

### Extract all links from a webpage

```bash
webscraper url https://example.com --format json | jq -r '.data.content' | grep -o 'https://[^"]*'
```

### Combine with other CLI tools

```bash
# Find all images on a page
webscraper url https://example.com --format json | jq -r '.data.content' | grep -o 'src="[^"]*"'
```

## Error Handling

The CLI tool will exit with a non-zero status code if an error occurs:

* Exit code 1: General error (invalid URL, network error, etc.)
```

// docs/troubleshooting.md
```
# Troubleshooting Guide

This guide helps you solve common issues you might encounter when using the Web Scraper.

## General Issues

### Installation Problems

**Issue**: Installation fails with dependency errors.

**Solution**:
1. Make sure you have the correct Node.js version (see `.nvmrc`):
   ```bash
   nvm use
   ```
2. Clear npm cache and try again:
   ```bash
   npm cache clean --force
   npm install
   ```
3. Check if there are any conflicting packages:
   ```bash
   npm ls
   ```

### Permission Issues

**Issue**: Permission denied when running the CLI.

**Solution**:
1. Make sure the CLI file is executable:
   ```bash
   chmod +x ./dist/cli.js
   ```
2. If using npx, try:
   ```bash
   npx --no-install webscraper
   ```

## API Issues

### Server Won't Start

**Issue**: The API server fails to start.

**Solution**:
1. Check if the port is already in use:
   ```bash
   lsof -i :6969
   ```
2. Kill the process using the port:
   ```bash
   kill -9 <PID>
   ```
3. Alternatively, change the port in the environment:
   ```bash
   PORT=7000 npm start
   ```

### Rate Limiting

**Issue**: Getting too many 429 (Too Many Requests) responses.

**Solution**:
1. The default rate limit is 30 requests per 15 minutes for the scraping endpoint.
2. Wait until the rate limit window resets.
3. If needed, you can adjust the rate limits in `src/middleware/rateLimiter.ts`.

### API Returns 500 Errors

**Issue**: Endpoint returns 500 Internal Server Error.

**Solution**:
1. Check the logs for detailed error information:
   ```bash
   cat logs/error.log
   ```
2. Verify that the database is properly set up:
   ```bash
   npm run prisma:generate
   npm run prisma:migrate
   ```
3. Ensure the URL you're trying to scrape is accessible.

## CLI Issues

### CLI Not Found

**Issue**: Command `webscraper` not found.

**Solution**:
1. If installed globally, check the npm global bin path:
   ```bash
   npm bin -g
   ```
2. Add the global bin path to your PATH if needed.
3. Use npx directly:
   ```bash
   npx webscraper
   ```

### Stdin Not Working

**Issue**: CLI doesn't read from stdin.

**Solution**:
1. Make sure you're providing input to stdin:
   ```bash
   echo "https://example.com" | npx webscraper
   ```
2. Check if the stdin is being properly piped:
   ```bash
   echo "https://example.com" | npx webscraper --debug
   ```

### Formatting Issues

**Issue**: CLI output formatting is broken or unreadable.

**Solution**:
1. Try using a different format:
   ```bash
   npx webscraper url https://example.com --format json
   ```
2. If terminal colors are causing issues, use the `--no-color` option:
   ```bash
   npx webscraper url https://example.com --no-color
   ```

## Scraping Issues

### Scraper Can't Access Website

**Issue**: The scraper fails to access certain websites.

**Solution**:
1. Check if the website is accessible from your browser.
2. Some websites block scrapers based on User-Agent. Try modifying the User-Agent:
   ```bash
   npx webscraper url https://example.com --user-agent "Mozilla/5.0"
   ```
3. Some websites use anti-bot protections. These may require more advanced techniques.

### Content Not Correctly Extracted

**Issue**: The scraper doesn't extract the expected content.

**Solution**:
1. Different websites structure their content differently. The scraper uses heuristics to find content.
2. Try viewing the raw HTML to understand the structure:
   ```bash
   curl https://example.com > page.html
   ```
3. You may need to customize the content extraction logic in `src/utils/contentExtractor.ts`.

### Performance Issues

**Issue**: Scraping is slow.

**Solution**:
1. Enable caching to avoid re-scraping the same URL:
   ```bash
   npx webscraper url https://example.com --use-cache
   ```
2. Increase the request timeout for slow websites:
   ```bash
   npx webscraper url https://example.com --timeout 30000
   ```
3. Use the built-in performance monitoring to identify bottlenecks:
   ```bash
   DEBUG=performance* npx webscraper url https://example.com
   ```

## Database Issues

### Prisma Errors

**Issue**: Prisma throws errors about missing migrations or model mismatches.

**Solution**:
1. Generate Prisma client:
   ```bash
   npm run prisma:generate
   ```
2. Run migrations:
   ```bash
   npm run prisma:migrate
   ```
3. If issues persist, you may need to reset the database:
   ```bash
   npx prisma migrate reset --force
   ```

### Database Connection Issues

**Issue**: Cannot connect to the database.

**Solution**:
1. Check that your DATABASE_URL environment variable is correct.
2. For SQLite, ensure the directory has write permissions.
3. For other databases, verify connection parameters and network access.

## Logging and Debugging

### Enable Debug Logging

To get more detailed information, enable debug logging:

```bash
DEBUG=* npm start
```

Or for CLI:

```bash
DEBUG=* npx webscraper url https://example.com
```

### View Logs

Application logs are stored in the `logs` directory:

```bash
cat logs/combined.log   # All logs
cat logs/error.log      # Error logs only
```

### Performance Analysis

To analyze performance:

```bash
DEBUG=performance* npm start
```

This will show timing information for different parts of the scraping process.

## Still Having Issues?

1. Check the GitHub issues to see if others have encountered the same problem.
2. Search the documentation for similar issues.
3. If all else fails, create a new issue with:
   - Detailed description of the problem
   - Steps to reproduce
   - Expected vs. actual behavior
   - Environment information (OS, Node.js version, etc.)
```

// README.md
```
# Web Scraper Dual-Interface

A dual-interface web scraping application that provides both an HTTP API and a Command-Line Interface (CLI).

## Features

- **HTTP API Server**: Acts as a "Model Context Protocol server" on port 6969
- **CLI Tool**: Provides a command-line interface using standard input/output
- **Shared Scraping Engine**: Core scraping logic is shared between both interfaces
- **Database Storage**: Scraped data is stored in a database using Prisma ORM
- **Performance Optimization**: Includes caching, request pooling, and optimized parsing
- **Comprehensive Testing**: Unit tests, integration tests, and CLI tests

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/webscraper-dual-interface.git
cd webscraper-dual-interface

# Install dependencies
npm install

# Generate Prisma client
npm run prisma:generate

# Build the project
npm run build
```

## Usage

### HTTP API

Start the API server:

```bash
npm start
```

The server will be available at http://localhost:6969

#### Endpoints

- `GET /api/scrape?url=<url>`: Scrape the provided URL and return the results
- `GET /health`: Simple health check endpoint
- `/api-docs`: Swagger UI documentation

Example:

```bash
curl http://localhost:6969/api/scrape?url=https://example.com
```

### CLI Tool

Use the CLI directly:

```bash
# Scrape a URL directly
npx webscraper url https://example.com

# Use with stdin/stdout (pipe a URL)
echo "https://example.com" | npx webscraper
```

For more detailed CLI usage, see [CLI Usage Guide](./docs/cli-usage.md).

## Development

```bash
# Run in development mode (with auto-reload)
npm run dev

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint

# Format code
npm run format
```

## Documentation

- [CLI Usage Guide](./docs/cli-usage.md) - Detailed CLI usage instructions
- [Examples](./docs/examples.md) - Common usage examples
- [Troubleshooting](./docs/troubleshooting.md) - Solutions to common issues
- [Architecture Decisions](./docs/adr/) - Architecture Decision Records

## Database

This project uses Prisma with SQLite by default. To use a different database:

1. Update the `provider` in `prisma/schema.prisma`
2. Set the appropriate `DATABASE_URL` in your environment
3. Run `npm run prisma:migrate`

## Project Structure

```
webscraper-dual-interface/
├── docs/               # Documentation
│   ├── adr/            # Architecture Decision Records
│   ├── cli-usage.md    # CLI usage guide
│   ├── examples.md     # Common examples
│   └── troubleshooting.md # Troubleshooting guide
├── node_modules/       # Dependencies
├── prisma/             # Prisma ORM files
│   └── schema.prisma   # Database schema
├── src/                # Source code
│   ├── core/           # Shared core functionality
│   ├── middleware/     # Express middleware
│   ├── routes/         # API routes
│   ├── services/       # Service classes
│   ├── utils/          # Utility functions
│   ├── __tests__/      # Tests
│   ├── cli.ts          # CLI entry point
│   └── index.ts        # API entry point
├── .eslintrc.js        # ESLint configuration
├── .gitignore          # Git ignore rules
├── .nvmrc              # Node.js version
├── .prettierrc.json    # Prettier configuration
├── jest.config.js      # Jest test configuration
├── package.json        # Package configuration
└── tsconfig.json       # TypeScript configuration
```

## License

MIT
```

// TASK.md
```
# Task List

This document tracks the tasks required to implement and maintain the Web Scraper Dual-Interface project.

## High Priority Tasks

### Project Setup
- [x] Initialize project structure
- [x] Configure TypeScript
- [x] Set up linting and formatting
- [x] Configure Jest for testing
- [x] Set up Prisma ORM
- [x] Create initial documentation

### API Implementation
- [x] Implement Express server
- [x] Create basic route handlers
- [x] Implement URL validation
- [x] Set up error handling middleware
- [x] Implement scraping endpoint
- [x] Add health check endpoint
- [x] Implement rate limiting
- [x] Add request logging
- [x] Document API endpoints

### CLI Implementation
- [x] Create CLI entry point
- [x] Implement stdin reading functionality
- [x] Add command-line argument parsing
- [x] Implement URL command
- [x] Create user-friendly output formatting
- [x] Add error handling
- [x] Create usage documentation

### Core Functionality
- [x] Implement basic HTTP request functionality
- [x] Create HTML parsing logic
- [x] Implement content extraction
- [x] Add metadata collection
- [x] Create database storage functionality
- [x] Implement error handling
- [x] Add retry logic
- [x] Create logging system

## Medium Priority Tasks

### Performance
- [x] Implement caching mechanism
- [x] Optimize HTML parsing
- [x] Add request pooling
- [x] Implement timeout handling
- [x] Profile and optimize performance bottlenecks

### Testing
- [x] Write unit tests for core functionality
- [x] Create integration tests for API
- [x] Add CLI tests
- [x] Implement test coverage reporting
- [x] Create mock services for testing

### Documentation
- [x] Create detailed API documentation
- [x] Write CLI usage guide
- [x] Document architecture decisions
- [x] Create examples for common use cases
- [x] Add troubleshooting guide

## Low Priority Tasks

### Features
- [ ] Add support for JavaScript-heavy sites
- [ ] Implement content filtering options
- [ ] Create data transformation pipeline
- [ ] Add export functionality for different formats
- [ ] Implement proxy support
- [ ] Add authentication for API

### Maintenance
- [ ] Set up CI/CD pipeline
- [ ] Create release process
- [ ] Implement semantic versioning
- [ ] Add dependency update automation
- [ ] Create contribution guidelines
- [ ] Set up issue templates

## Backlog

- [ ] Consider browser automation integration
- [ ] Research distributed scraping architecture
- [ ] Evaluate alternative storage options
- [ ] Consider implementing a web interface
- [ ] Explore machine learning for content extraction
- [ ] Research legal and ethical considerations
```

// PLANNING.md
```
# Project Planning Document

This document outlines the planning for the Web Scraper Dual-Interface project.

## Project Overview

The Web Scraper Dual-Interface is a versatile application designed to function in two distinct modes:

1. **HTTP API Server (Model Context Protocol server)**
   - Runs on port 6969
   - Provides scraping functionality via RESTful endpoints
   - Intended for integration with other applications
   - Returns scraped content in structured JSON format

2. **Command-Line Interface (CLI) Tool**
   - Uses standard input/output (stdin/stdout) for data exchange
   - Can be run via `npx`
   - Provides direct access to scraping functionality from terminal
   - Supports piping and redirection

## Architecture

### Core Components

1. **Scraping Engine**
   - Shared between both interfaces
   - Responsible for fetching and parsing web content
   - Extracts relevant information based on configurable rules
   - Handles error scenarios and retries

2. **Storage Layer**
   - Prisma ORM for database interactions
   - Stores scraped data for future reference
   - Supports caching to minimize redundant scraping

3. **API Layer**
   - Express.js based HTTP server
   - Implements RESTful endpoints
   - Handles validation, error handling, and responses

4. **CLI Layer**
   - Command-line interface using Commander.js
   - Processes stdin/stdout interactions
   - Provides user-friendly feedback

## Implementation Plan

### Phase 1: Foundation ✓
- [x] Set up project structure
- [x] Configure build tools and linting
- [x] Implement basic scraping functionality
- [x] Create database schema

### Phase 2: API Implementation ✓
- [x] Develop Express server
- [x] Implement API endpoints
- [x] Add validation and error handling
- [x] Document API usage

### Phase 3: CLI Implementation ✓
- [x] Create CLI entry point
- [x] Implement stdin/stdout handling
- [x] Add command-line options
- [x] Document CLI usage

### Phase 4: Enhancement ✓
- [x] Implement caching mechanism
- [x] Add advanced scraping features
- [x] Optimize performance
- [x] Improve error handling and reporting

### Phase 5: Documentation and Testing ✓
- [x] Write comprehensive tests
- [x] Complete documentation
- [x] Create usage examples
- [x] Performance testing and optimization

## Technical Decisions

- **TypeScript**: For type safety and better developer experience
- **Express.js**: Lightweight and flexible web framework
- **Prisma**: Modern ORM with strong type integration
- **Jest**: Testing framework for unit and integration tests
- **Zod**: Runtime validation for inputs
- **Cheerio**: HTML parsing and manipulation
- **Commander.js**: CLI argument parsing
- **Winston**: Structured logging
- **Node-cache**: In-memory caching

## Future Considerations

- Distributed scraping with worker processes
- Authentication and authorization for API
- Rate limiting and proxy support
- Browser automation for JavaScript-heavy sites
- Content extraction algorithms improvement
- Support for more complex scraping scenarios
- Integration with other tools and platforms

## Next Steps

- Add support for JavaScript-heavy sites
- Implement content filtering options
- Create data transformation pipeline
- Add export functionality for different formats
- Implement proxy support
- Add authentication for API
```

// CHANGELOG.md
```
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial project structure
- Dual interface (HTTP API and CLI)
- Basic scraping functionality
- Prisma ORM integration
- Project documentation
- In-memory caching mechanism
- Request pooling and timeout handling
- Performance monitoring utilities
- Comprehensive test suite
- Enhanced documentation

## [0.1.0] - YYYY-MM-DD

### Added
- Initial release
```
