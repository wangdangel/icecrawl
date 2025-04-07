# Icecrawl

A powerful, dual-interface web scraping application that provides both an HTTP API and a Command-Line Interface (CLI), complete with a web dashboard.

## Features

- **HTTP API Server**: RESTful API endpoints for seamless integration
- **CLI Tool**: Command-line interface using standard input/output
- **Web Dashboard**: User-friendly interface for managing scrapes and viewing results
- **Authentication**: User management with role-based access control
- **Shared Scraping Engine**: Core scraping logic shared between all interfaces
- **Database Storage**: Persistent storage using Prisma ORM
- **Performance Optimization**: Caching, request pooling, and optimized parsing
- **Content Transformation**: Apply transformers to process scraped content
- **Export Functionality**: Export data in multiple formats (JSON, CSV, XML, etc.)
- **Scheduled Scraping**: Schedule recurring scrape jobs
- **Proxy Support**: Rotate through proxies to avoid IP blocks
- **Comprehensive Testing**: Unit tests, integration tests, and CLI tests

## Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/wangdangel/icecrawl.git
cd icecrawl

# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env file with your configuration

# Apply database migrations (creates/updates database schema)
# Note: This command may reset the database if schema drift is detected.
npx prisma migrate dev

# Generate Prisma client (based on the schema)
npm run prisma:generate

# Build the project and dashboard
npm run build
npm run build:dashboard
```

### Start the Server

```bash
npm start
```

The server will be available at:
- Dashboard: http://localhost:6969/dashboard
- API: http://localhost:6969/api
- API Documentation: http://localhost:6969/api-docs

### Using the CLI

```bash
# Scrape a specific URL
npm run cli url https://example.com

# Pipe URLs from a file
cat urls.txt | npm run cli

# Get help
npm run cli --help
```

## Project Structure

```
icecrawl/
├── .github/              # GitHub configuration (workflows, templates)
├── docs/                 # Documentation
│   ├── adr/              # Architecture Decision Records
│   └── ...               # Other documentation
├── prisma/               # Prisma ORM files
│   └── schema.prisma     # Database schema
├── public/               # Static assets for the dashboard
│   └── dashboard/        # Dashboard UI files
├── scripts/              # Utility scripts
├── src/                  # Source code
│   ├── core/             # Core functionality (scraper engine)
│   ├── exporters/        # Data exporters
│   ├── middleware/       # Express middleware
│   ├── routes/           # API routes
│   ├── services/         # Service classes
│   ├── transformers/     # Content transformers
│   ├── utils/            # Utility functions
│   ├── cli.ts            # CLI entry point
│   └── index.ts          # API server entry point
└── tests/                # Tests
```

## Development

```bash
# Run in development mode (with auto-restart)
npm run dev

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint

# Format code
npm run format

# Open Prisma Studio (database UI)
npm run prisma:studio
```

## CI/CD Workflow

This project uses GitHub Actions for CI/CD:

1. **Continuous Integration**:
   - Runs on every push and pull request
   - Lints code
   - Builds the project
   - Runs tests
   - Generates coverage report

2. **Deployment**:
   - Deploys to staging on pushes to `develop` branch
   - Deploys to production on pushes to `main` branch

## Contribution Guidelines

1. Follow the [conventional commits](https://www.conventionalcommits.org/) specification for commit messages
2. Make sure all tests pass before submitting a pull request
3. Update documentation as needed
4. Add tests for new features
5. Follow the coding style enforced by ESLint and Prettier

## Releasing

This project uses [Standard Version](https://github.com/conventional-changelog/standard-version) for versioning:

```bash
# Release a new major version
npm run release:major

# Release a new minor version
npm run release:minor

# Release a new patch version
npm run release:patch
```

## API Documentation

API documentation is available at `http://localhost:6969/api-docs` when the server is running. It is generated using Swagger UI based on JSDoc annotations in the route files.

## Web Dashboard

The web dashboard provides a user-friendly interface for:

- Viewing scraping statistics
- Managing scrape jobs
- Viewing scraped content
- Applying transformers
- Exporting data
- User management

Access it at `http://localhost:6969/dashboard`.

## CLI Usage

For detailed CLI usage, see [CLI Usage Guide](./docs/cli-usage.md).

## MCP Server Interface

Icecrawl can also run as a Model Context Protocol (MCP) server, allowing programmatic interaction via MCP clients (like AI assistants).

### Configuring the MCP Server in Clients (e.g., Cline)

To use this server with an MCP client like Cline, you need to configure it in the client's settings. The server should be executed directly using `node` with the absolute path to the compiled script.

**Example Cline Configuration (`cline_mcp_settings.json`):**

```json
{
  "mcpServers": {
    // ... other servers ...
    "icecrawl-mcp": {
      "command": "node",
      "args": [
        // Replace with the ABSOLUTE path to your project's compiled file
        "k:/Documents/smart_crawler/dist/mcp-server.js"
      ],
      // Important: Set cwd to the project root for .env loading
      "cwd": "k:/Documents/smart_crawler",
      "disabled": false,
      "autoApprove": [], // Configure auto-approval as needed
      "timeout": 60,
      "transportType": "stdio"
    }
    // ... other servers ...
  }
}
```

**Prerequisites:**
- Ensure Node.js is installed and accessible in the environment where the client runs the command.
- Build the project first using `npm run build` to generate the `dist/mcp-server.js` file.
- Make sure the `.env` file exists in the `cwd` (`k:/Documents/smart_crawler` in this example) with the correct `DATABASE_URL`.

The server communicates over standard input/output.

### Available MCP Tools

The following tools are exposed via the MCP interface:

-   **`scrape_url`**: Fetches, scrapes, and optionally captures HTML/screenshot from a single URL.
    -   Inputs: `url` (required), `outputFormats` (optional array: "json", "markdown", "html", "screenshot"), `selectors` (optional object), `useBrowser` (optional boolean), `waitForSelector` (optional string), `proxy` (optional string).
    -   Output: JSON object containing requested data (`jsonData`, `markdownData`, `htmlContent`, `screenshotBase64`).
-   **`start_crawl`**: Initiates an asynchronous job to crawl a website.
    -   Inputs: `startUrl` (required), `outputFormat` (optional: "json", "markdown", "both" - for final result), `maxDepth` (optional int), `domainScope` (optional boolean), `includePatterns` (optional array), `excludePatterns` (optional array), `useBrowser` (optional boolean), `waitForSelector` (optional string), `proxy` (optional string).
    -   Output: JSON object `{ "jobId": "..." }`.
-   **`get_crawl_job_result`**: Retrieves the status and results of a crawl job.
    -   Inputs: `jobId` (required).
    -   Output: JSON object with job status, progress, and final results (`jsonData` or `markdownData`) if completed.

*Note: This interface does not require separate authentication beyond the ability to execute the command.*

## License

MIT
