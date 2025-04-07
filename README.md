# Icecrawl

[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-Donate-yellow?logo=buy-me-a-coffee&style=flat-square)](https://buymeacoffee.com/ambientflare)

A powerful web scraping application offering multiple interfaces: HTTP API (with Dashboard), CLI, and MCP Server.

---

## Features

- **Multiple Interfaces**:
  - **HTTP API Server**: RESTful API for integration, includes a web dashboard.
  - **CLI Tool**: `icecrawl` command for terminal-based scraping.
  - **MCP Server**: `icecrawl-mcp` command for programmatic use with MCP clients.
- **Web Dashboard**: User-friendly UI for managing scrapes and viewing results.
- **Authentication**: User management with role-based access control.
- **Database Storage**: Persistent storage using Prisma ORM (SQLite default).
- **Crawling**: Asynchronous website crawling with depth and scope control.
- **Flexible Output**: JSON, Markdown, raw HTML, or screenshots.
- **Performance Optimization**: Caching, request pooling.
- **Proxy Support**: Use proxies for requests.
- **JS Rendering**: Optional headless browser usage via Puppeteer.
- *And more: Content Transformation, Exporting, Scheduled Jobs...*

---

## Installation

### From npm (Recommended)

```bash
npm install -g icecrawl
```

- Creates a default data directory:
  - **Windows:** `C:\Users\<username>\Documents\Icecrawl`
  - **macOS/Linux:** `~/Icecrawl`
- Generates `.env` file, initializes database, seeds default admin user.
- After install:

```bash
icecrawl --help
icecrawl-mcp
```

### From Source (Development)

```bash
git clone https://github.com/wangdangel/icecrawl.git
cd icecrawl
npm install
cp .env.example .env
# Edit .env with your config
npx prisma migrate dev
npm run prisma:generate
npm run build
npm run build:dashboard
# Optionally: npm link
```

---

## Usage

### HTTP API Server & Dashboard

```bash
icecrawl-server start
# or
npm start
# or
npm run dev
```

- Dashboard: http://localhost:6969/dashboard
- API Docs: http://localhost:6969/api-docs

### CLI Tool

```bash
icecrawl url https://example.com
icecrawl --help
# or
npm run cli url https://example.com
npm run cli --help
```

### MCP Server

```bash
icecrawl-mcp
# or
node dist/mcp-server.js
```

---

## MCP Server Configuration Example

Add this to your MCP client configuration (e.g., Cline):

```json
{
  "command": "node",
  "args": ["k:/Documents/smart_crawler/dist/mcp-server.js"],
  "cwd": "k:/Documents/smart_crawler",
  "disabled": false,
  "autoApprove": [],
  "timeout": 60,
  "transportType": "stdio"
}
```

---

## Default Login Credentials

For initial access after seeding:

| Username | Password  | Email               | Role  |
|-----------|-----------|---------------------|--------|
| admin     | password  | admin@example.com   | admin  |

---

## Development Commands

```bash
npm test
npm run test:coverage
npm run lint
npm run format
npm run prisma:studio
```

---

## Project Structure

*To be documented.*

## CI/CD Workflow

*To be documented.*

## Contribution Guidelines

*To be documented.*

## Releasing

*To be documented.*

---

## License

MIT
