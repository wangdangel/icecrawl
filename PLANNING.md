# Project Planning Document

This document outlines the planning for the Web Scraper Dual-Interface project.

## Project Overview

Icecrawl is a versatile web scraping application designed to function via three distinct interfaces:

1.  **HTTP API Server**

    - Runs on port 6971 (default, configurable via PORT env var).
    - Provides scraping and job management via RESTful endpoints.
    - Includes a web dashboard for UI interaction.
    - Intended for web-based integration and user interaction.
    - Uses API key and/or session-based authentication.

2.  **Command-Line Interface (CLI) Tool**

    - Accessible via `npx icecrawl`.
    - Uses standard input/output (stdin/stdout) for data exchange.
    - Provides direct access to scraping functionality from the terminal.
    - Supports piping and redirection.

3.  **Model Context Protocol (MCP) Server**
    - Accessible via `npx icecrawl-mcp`.
    - Communicates over standard input/output using the MCP specification.
    - Exposes core scraping and crawling functionality as MCP tools.
    - Intended for programmatic integration with MCP clients (e.g., AI assistants).
    - Does not implement separate authentication (relies on execution context).

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
- **@modelcontextprotocol/sdk**: For implementing the MCP server interface

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
