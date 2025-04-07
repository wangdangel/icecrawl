# Icecrawl

A powerful web scraping application offering multiple interfaces: HTTP API (with Dashboard), CLI, and MCP Server.

## Features

-   **Multiple Interfaces**:
    -   **HTTP API Server**: RESTful API for integration, includes a web dashboard. Accessible via `icecrawl-server start`.
    -   **CLI Tool**: `icecrawl` command for terminal-based scraping.
    -   **MCP Server**: `icecrawl-mcp` command for programmatic use with MCP clients (like AI assistants).
-   **Web Dashboard**: User-friendly UI for managing scrapes and viewing results.
-   **Authentication**: User management with role-based access control (for API/Dashboard).
-   **Database Storage**: Persistent storage using Prisma ORM (SQLite default).
-   **Crawling**: Asynchronous website crawling with depth and scope control.
-   **Flexible Output**: Get results as JSON, Markdown, raw HTML, or page screenshots (via `scrape_url` MCP tool).
-   **Performance Optimization**: Caching, request pooling.
-   **Proxy Support**: Use proxies for requests.
-   **JS Rendering**: Optional headless browser usage via Puppeteer.
-   *And more (Content Transformation, Exporting, Scheduled Jobs...)*

## Installation

### Option 1: From npm (Recommended for Users)

```bash
# Install globally from npm
npm install -g icecrawl

# --- Initial Setup (Required on first install/run) ---

# 1. Create a project directory where data will be stored
mkdir my-icecrawl-data
cd my-icecrawl-data

# 2. Create a .env file
#    You MUST set DATABASE_URL, e.g., DATABASE_URL="file:./icecrawl.db"
#    You SHOULD set a secure JWT_SECRET
echo "DATABASE_URL=\"file:./icecrawl.db\"" > .env
echo "JWT_SECRET=\"$(openssl rand -hex 32)\"" >> .env # Example for generating secret

# 3. Initialize the database (creates the DB file and schema)
#    Run this command from your data directory ('my-icecrawl-data')
#    (Requires npx, usually installed with Node.js)
#    Note: Replace <path-to-global-node-modules> with your actual global npm path (find with `npm root -g`).
npx prisma migrate deploy --schema="<path-to-global-node-modules>/icecrawl/prisma/schema.prisma"

# 4. Seed initial data (optional, creates default admin user etc.)
#    (Requires npx and ts-node)
#    Run from your data directory:
# npx ts-node "<path-to-global-node-modules>/icecrawl/prisma/seed.ts"
```
*Note: Database setup for globally installed npm packages involving Prisma can be complex. If you encounter issues, consider the "From Source" method.*

### Option 2: From Source (for Development)

```bash
# Clone the repository
git clone https://github.com/wangdangel/icecrawl.git
cd icecrawl

# Install dependencies (including devDependencies)
npm install

# Set up environment
cp .env.example .env
# Edit .env file with your configuration (DATABASE_URL, JWT_SECRET, etc.)

# Apply database migrations (creates/updates database schema)
npx prisma migrate dev

# Generate Prisma client
npm run prisma:generate

# Build the project and dashboard
npm run build
npm run build:dashboard

# (Optional) Link the commands globally for easier access during development
# npm link
```

## Usage

Ensure you are running commands from the directory containing your `.env` file and database (e.g., `my-icecrawl-data` if installed from npm, or the project root if running from source).

### HTTP API Server & Dashboard

```bash
# If installed globally:
icecrawl-server start

# If running from source:
npm start
# Or for development with auto-reload: npm run dev

# Access:
# - Dashboard: http://localhost:6969/dashboard (Default port 6969)
# - API Docs: http://localhost:6969/api-docs
```

### CLI Tool

```bash
# If installed globally:
icecrawl url https://example.com
icecrawl --help

# If running from source:
npm run cli url https://example.com
npm run cli --help
```

### MCP Server

```bash
# If installed globally:
icecrawl-mcp

# If running from source:
node dist/mcp-server.js

# --- Configuring in MCP Clients (e.g., Cline) ---
# Regardless of how you run it, configure the client like this:
#
# Command: node
# Args: ["<ABSOLUTE_PATH_TO>/dist/mcp-server.js"]
#   (e.g., "k:/Documents/smart_crawler/dist/mcp-server.js" if running from source)
#   (e.g., "<path-to-global-node-modules>/icecrawl/dist/mcp-server.js" if installed globally)
# Cwd: "<PATH_TO_YOUR_DATA_DIRECTORY>" (containing .env and DB file)
#   (e.g., "k:/Documents/smart_crawler" if running from source)
#   (e.g., "/path/to/my-icecrawl-data" if installed globally)
```

#### Available MCP Tools

-   **`scrape_url`**: Fetches/scrapes a single URL.
    -   Inputs: `url`, `outputFormats` (json, markdown, html, screenshot), `selectors`, `useBrowser`, `waitForSelector`, `proxy`.
    -   Output: JSON with `jsonData`, `markdownData`, `htmlContent`, `screenshotBase64`.
-   **`start_crawl`**: Starts an async crawl job.
    -   Inputs: `startUrl`, `outputFormat` (json, markdown, both), `maxDepth`, `domainScope`, `includePatterns`, `excludePatterns`, `useBrowser`, `waitForSelector`, `proxy`.
    -   Output: JSON `{ "jobId": "..." }`.
-   **`get_crawl_job_result`**: Gets crawl job status/results.
    -   Inputs: `jobId`.
    -   Output: JSON with status, progress, and `jsonData` or `markdownData`.

## Development Commands

(Only relevant when working from source)

```bash
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

## Project Structure

(Kept from original)

## CI/CD Workflow

(Kept from original)

## Contribution Guidelines

(Kept from original)

## Releasing

(Kept from original)

## License

MIT
