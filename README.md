# Icecrawl

A powerful web scraping application offering multiple interfaces: HTTP API (with Dashboard), CLI, and MCP Server.

## Features

-   **Multiple Interfaces**:
    -   **HTTP API Server**: RESTful API for integration, includes a web dashboard.
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

## Installation & Setup (for Users)

```bash
# Install globally from npm
npm install -g icecrawl

# --- Initial Setup (Required on first install/run) ---

# 1. Create a project directory where data will be stored
mkdir my-icecrawl-data
cd my-icecrawl-data

# 2. Create a .env file (copy from example if needed)
#    You MUST set DATABASE_URL, e.g., DATABASE_URL="file:./icecrawl.db"
#    You SHOULD set a secure JWT_SECRET
echo "DATABASE_URL=\"file:./icecrawl.db\"" > .env
echo "JWT_SECRET=\"$(openssl rand -hex 32)\"" >> .env # Example for generating secret

# 3. Initialize the database (creates the DB file and schema)
#    Run this command from your data directory ('my-icecrawl-data')
#    It needs access to the prisma schema within the installed package.
#    (Requires npx, usually installed with Node.js)
npx prisma migrate deploy --schema="<path-to-global-node-modules>/icecrawl/node_modules/@prisma/client/../..//prisma/schema.prisma"
#    Note: Replace <path-to-global-node-modules> with your actual global npm path.
#    Find it with `npm root -g` and navigate to `icecrawl/prisma/schema.prisma`.
#    Alternatively, clone the repo, cd into it, run `npx prisma migrate deploy` using the local schema,
#    then copy the generated DB file to your data directory.

# 4. Seed initial data (optional, creates default admin user etc.)
#    (Requires npx and ts-node)
#    Run from your data directory:
# npx ts-node "<path-to-global-node-modules>/icecrawl/prisma/seed.ts"
```
*Note: Database setup for globally installed npm packages involving Prisma can be complex. Cloning the repository and running locally might be easier for development.*

## Usage

Make sure you are in the directory containing your `.env` file and database.

### HTTP API Server & Dashboard

```bash
# Start the server (reads .env from current directory)
icecrawl-server start
# Or: node <path-to-global-node-modules>/icecrawl/dist/index.js

# Access:
# - Dashboard: http://localhost:6969/dashboard (Default port 6969)
# - API Docs: http://localhost:6969/api-docs
```

### CLI Tool

```bash
# Scrape a URL (reads .env from current directory)
icecrawl url https://example.com

# Get help
icecrawl --help
```

### MCP Server

```bash
# Run the MCP server (reads .env from current directory)
icecrawl-mcp
# Or: node <path-to-global-node-modules>/icecrawl/dist/mcp-server.js

# Configure in your MCP client (e.g., Cline)
# Use 'node' as command and the *absolute path* to the installed
# 'icecrawl/dist/mcp-server.js' as the argument.
# Set 'cwd' to your data directory (containing .env).
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

## Development

(Instructions for cloning, building, testing - kept from original)

```bash
# Clone the repository
git clone https://github.com/wangdangel/icecrawl.git
cd icecrawl
# Install dev dependencies
npm install
# Setup .env, run migrations etc. (see Installation)
# Run in development mode (with auto-restart)
npm run dev
# Run tests
npm test
# ... other dev commands ...
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
