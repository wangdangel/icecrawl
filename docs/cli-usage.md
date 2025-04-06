# Icecrawl CLI Usage Guide

The Icecrawl tool provides a powerful command-line interface (CLI) for scraping web content directly from your terminal.

## Installation

```bash
# Install globally
npm install -g icecrawl

# Or use directly with npx
npx icecrawl --help
```

## Basic Usage

### Scrape a URL directly

```bash
icecrawl url https://example.com
```

### Pipe a URL to the scraper

```bash
echo "https://example.com" | icecrawl
```

### Pipe content from a file

```bash
cat urls.txt | icecrawl
```

## Output Formats

The CLI supports multiple output formats:

### Pretty (default)

Displays a formatted table with the scraped data:

```bash
icecrawl url https://example.com --format pretty
# or
icecrawl url https://example.com
```

### JSON

Returns the raw JSON data (useful for piping to other tools):

```bash
icecrawl url https://example.com --format json
```

### Minimal

Displays a simplified output with just the title, URL, and content preview:

```bash
icecrawl url https://example.com --format minimal
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
icecrawl url https://example.com
```

### JSON output (for programmatic use)

```bash
icecrawl url https://example.com --format json > result.json
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
  icecrawl url "$url" --format json >> results.json
done
```

### Silent operation (for scripts)

```bash
icecrawl url https://example.com --silent --format json
```

## Integration Examples

### Extract all links from a webpage

```bash
icecrawl url https://example.com --format json | jq -r '.data.content' | grep -o 'https://[^"]*'
```

### Combine with other CLI tools

```bash
# Find all images on a page
icecrawl url https://example.com --format json | jq -r '.data.content' | grep -o 'src="[^"]*"'
```

## Error Handling

The CLI tool will exit with a non-zero status code if an error occurs:

* Exit code 1: General error (invalid URL, network error, etc.)
