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

## License

MIT
