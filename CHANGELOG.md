# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [0.3.23](https://github.com/wangdangel/icecrawl/compare/v0.3.22...v0.3.23) (2025-04-07)

### [0.3.22](https://github.com/wangdangel/icecrawl/compare/v0.3.21...v0.3.22) (2025-04-07)

### [0.3.21](https://github.com/wangdangel/icecrawl/compare/v0.3.20...v0.3.21) (2025-04-07)

### [0.3.20](https://github.com/wangdangel/icecrawl/compare/v0.3.19...v0.3.20) (2025-04-07)

### [0.3.19](https://github.com/wangdangel/icecrawl/compare/v0.3.18...v0.3.19) (2025-04-07)

### [0.3.18](https://github.com/wangdangel/icecrawl/compare/v0.3.17...v0.3.18) (2025-04-07)

### [0.3.17](https://github.com/wangdangel/icecrawl/compare/v0.3.16...v0.3.17) (2025-04-07)

### [0.3.16](https://github.com/wangdangel/icecrawl/compare/v0.3.15...v0.3.16) (2025-04-07)

### [0.3.15](https://github.com/wangdangel/icecrawl/compare/v0.3.14...v0.3.15) (2025-04-07)

### [0.3.14](https://github.com/wangdangel/icecrawl/compare/v0.3.12...v0.3.14) (2025-04-07)

### [0.3.12](https://github.com/wangdangel/icecrawl/compare/v0.3.6...v0.3.12) (2025-04-07)

### [0.3.6](https://github.com/wangdangel/icecrawl/compare/v0.3.2...v0.3.6) (2025-04-07)

### [0.3.2](https://github.com/wangdangel/icecrawl/compare/v0.3.1...v0.3.2) (2025-04-07)

### [0.3.1](https://github.com/wangdangel/icecrawl/compare/v0.3.0...v0.3.1) (2025-04-07)

## [0.3.0](https://github.com/wangdangel/icecrawl/compare/v0.2.0...v0.3.0) (2025-04-07)


### Features

* Implement MCP Server Interface\n\nAdds a Model Context Protocol (MCP) server interface to Icecrawl, allowing programmatic interaction via MCP clients.\n\n- Installs @modelcontextprotocol/sdk dependency.\n- Creates src/mcp-server.ts as the server entry point, loading .env.\n- Implements ListTools handler defining scrape_url, start_crawl, and get_crawl_job_result tools with their input schemas.\n- Implements CallTool handler with basic logic for each tool, leveraging existing services (Scraper, MarkdownService, Prisma, BrowserService).\n- Adds icecrawl-mcp command to package.json bin field.\n- Updates README.md and PLANNING.md to document the new interface and configuration.\n- Updates TASK.md to track MCP integration progress. ([e0ecc19](https://github.com/wangdangel/icecrawl/commit/e0ecc19bd91b08636af53bc5cd6cc27b190ea1da))


### Bug Fixes

* align package.json with npm publish corrections ([6d7b79d](https://github.com/wangdangel/icecrawl/commit/6d7b79d8c1d0f2bb1195d6fdcf2f0799697d48a4))

## 0.2.0 (2025-04-07)


### Features

* Add CI/CD, linting, API keys, dashboard, and user features ([0c087a3](https://github.com/wangdangel/icecrawl/commit/0c087a372f9d67ecfda9b733091aaacf1698ccad))
* Fix login issues and automate DB setup with seeding ([1b6dc49](https://github.com/wangdangel/icecrawl/commit/1b6dc4949900259c86f3de75466135ec004a79a8))
* Implement background job processing and fix dashboard errors ([3c1b184](https://github.com/wangdangel/icecrawl/commit/3c1b1845fe02b8d694004cc6a5d4240fa59075df))
* Implement website crawl-to-markdown feature ([225676c](https://github.com/wangdangel/icecrawl/commit/225676cdee204ee92ab71443735f8433cf450d1a))
* prepare for npm publish, rename to icecrawl, fix build errors ([c989eea](https://github.com/wangdangel/icecrawl/commit/c989eeaa2a8c17ee6da16c7355254887150d3b0f))
* Refactor services and controllers for user and dashboard ([6fd84a5](https://github.com/wangdangel/icecrawl/commit/6fd84a51491a1b30940692746949fa2096087488))


### Bug Fixes

* Resolve dashboard loading issues and related errors\n\n- Corrected dashboard statistics calculation in DashboardService to include pending/failed job counts.\n- Reset and re-seeded the database (dev.db) due to missing tables identified during debugging.\n- Updated package.json to configure Prisma seeding.\n- Fixed incorrect API path for login requests in login.html (/api/users/login -> /api/auth/login).\n- Corrected the API response structure for crawl jobs in DashboardController to include proper pagination details.\n- Added debug logging to DashboardService.getStatistics.\n- Updated TASK.md to mark dashboard investigation as complete. ([dc35bef](https://github.com/wangdangel/icecrawl/commit/dc35bef1263bc0c9ab15c07e99d95fe3794b37af))

## [0.1.0] - YYYY-MM-DD

### Added
- Initial release
