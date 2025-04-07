# Task List

This document tracks the tasks required to implement and maintain the Web Scraper Dual-Interface project.

## High Priority Tasks

- [x] Refactor CLI to support:
  - Default command starts Dashboard + MCP server
  - Subcommands: `dashboard`, `mcp-server`, `scrape`
  - Updated documentation (`README.md`, `docs/cli-usage.md`)
  - Improved global usability (Added: 2025-04-07)

- [x] Fix TypeScript errors in dashboardService.ts (Added: 2025-04-07)
- [ ] Publish patched version to npm, ensuring <code>scripts/global-postinstall.js</code> is included and runs on install (Added: 2025-04-07)
- [x] Fix `npm run dev` crash (Added: 2025-04-06)
- [x] Investigate unexpected port usage (e.g., using ports other than configured `PORT`) (Added: 2025-04-07) - *Finding: Other ports are likely ephemeral ports used internally by Puppeteer (BrowserService) for Chrome DevTools Protocol communication, which is expected behavior.*

### Maintenance (Added: 2025-04-07)
- [x] Ensure Global Installation (`npm install -g icecrawl`) Works Smoothly
    - [x] Verify `bin` configuration in `package.json`
    - [x] Examine/modify `scripts/install-script.js` for post-install setup

### Documentation (Added: 2025-04-07)
- [ ] Update `README.md`
    - [ ] Add MCP server configuration JSON example
    - [ ] Replace "kept from original" placeholders (CI/CD, Contributing, Releasing)
    - [ ] Add "Buy Me a Coffee" link/badge
    - [ ] Add default login credentials from `prisma/seed.ts`

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

### Features (Added: 2025-04-07)
- [ ] Implement Pagination Following Feature
    - [ ] Modify core scraper/crawler logic (accept selector/limit)
    - [ ] Implement sequential page navigation/scraping
    - [ ] Update API/MCP to accept parameters
    - [ ] Add UI elements to Dashboard modals
- [ ] Implement Dashboard - Scheduled Jobs
- [ ] Implement Dashboard - Profile/Settings
- [ ] Implement Dashboard - Transformers Page
- [ ] Implement Dashboard - Scrape/Crawl Options (Add relevant options like output format, useBrowser, etc. to modals)

### Maintenance (Added: 2025-04-07)
- [ ] Update Dependencies & Address `npm audit` Vulnerabilities
    - [ ] Run `npm audit` and analyze report
    - [ ] Run `npm outdated`
    - [ ] Update packages (prioritizing vulnerability fixes)
    - [ ] Run `npm audit fix` if applicable
    - [ ] Test thoroughly after updates

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
- [ ] Run existing tests and set up necessary new tests (Added: 2025-04-07)
    - [x] Run existing tests (`npm run test`) (2025-04-07)
    - [x] Fix failures in `scraper.test.ts` (mocking issues) (2025-04-07)
    - [x] Fix failures in `api.test.ts` (auth middleware mocking) (2025-04-07)
    - [x] Fix failures in `cli.test.ts` (output parsing) (2025-04-07)
    - [x] Add tests for `AuthService` (2025-04-07)
    - [x] Add tests for `UserService` (2025-04-07)
    - [x] Add tests for `UserController` (2025-04-07)
    - [ ] Add tests for Controllers (Admin, Dashboard)
    - [ ] Add tests for other Services (API Key, Browser, Cache, Dashboard, Markdown, Proxy, Session)
    - [ ] Add tests for other core components (Crawler, Worker)
    - [ ] Improve overall coverage to meet threshold (currently ~26%)

### Documentation
- [x] Create detailed API documentation
- [x] Write CLI usage guide
- [x] Document architecture decisions
- [x] Create examples for common use cases
- [x] Add troubleshooting guide

## Low Priority Tasks

### Features
- [ ] Implement Dashboard - Title/Link Update (Change title to "Ice Crawler", link to main dashboard) (Added: 2025-04-07)
- [ ] Implement Dashboard - Aesthetic Improvements (Added: 2025-04-07)
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
- [ ] Review code base for architecture, style, and improvements (Added: 2025-04-07)

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
