# Task List

This document tracks the tasks required to implement and maintain the Web Scraper Dual-Interface project.

## High Priority Tasks

- [x] Fix TypeScript errors in dashboardService.ts (Added: 2025-04-07)
- [x] Fix `npm run dev` crash (Added: 2025-04-06)

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
- [x] Remove constant debug info from CLI (Added: 2025-04-06)

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
- [x] Investigate dashboard update issues (Added: 2025-04-06)
- [x] Fix 'Recent Scrapes' not showing data (Added: 2025-04-06) - *Resolved by running migrations, DB was reset.*

### Documentation
- [x] Create detailed API documentation
- [x] Write CLI usage guide
- [x] Document architecture decisions
- [x] Create examples for common use cases
- [x] Add troubleshooting guide

## Low Priority Tasks

### Features
- [x] Add support for JavaScript-heavy sites
- [x] Implement content filtering options
- [x] Create data transformation pipeline
- [x] Add export functionality for different formats
- [x] Implement proxy support
- [x] Add authentication for API
- [ ] Implement Website Crawl-to-Markdown Feature (Added: 2025-04-06)
    - [x] Define `CrawlJob` model and add `markdownContent` to `ScrapedPage`
    - [x] Implement Crawler logic (queue, visited, depth, scope)
    - [x] Implement Markdown conversion service
    - [x] Enhance Worker to process `CrawlJob`s with retries
    - [x] Create API endpoints (`POST /api/crawl`, `GET /api/crawl/{jobId}`)
    - [x] Add basic UI elements to Dashboard for crawl jobs

### Maintenance
- [x] Update npm packages (Added: 2025-04-06)
- [x] Publish npm package v0.2.0 (Added: 2025-04-06)
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

## Code Review
- [x] Review the code base (Added: 2025-04-06)

## MCP Integration (Added: 2025-04-07)

- [ ] Implement MCP Server Interface
    - [x] Add `@modelcontextprotocol/sdk` dependency (2025-04-07)
    - [x] Create MCP server entry point (`src/mcp-server.ts`) (2025-04-07)
    - [x] Define MCP tools (`scrape_url`, `start_crawl`, `get_crawl_job_result`) (2025-04-07)
    - [x] Implement basic tool handlers (using existing services, placeholders for crawl results) (2025-04-07)
    - [x] Add `bin` entry for `npx icecrawl-mcp` (replaces npm script) (2025-04-07)
    - [x] Update documentation (`PLANNING.md`, `README.md`) (2025-04-07)
    - [ ] Refine `scrape_url` HTML fetching (avoid double fetch)
    - [ ] Implement `get_crawl_job_result` logic to fetch/format actual page data (requires schema relation or alternative)
