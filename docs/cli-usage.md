# Icecrawl CLI Usage Guide

The Icecrawl CLI provides:

- A unified command to launch the **Dashboard UI** and **MCP server**
- Subcommands to launch each server individually
- Powerful scraping commands via CLI or stdin

---

## Installation

```bash
# Install globally
npm install -g icecrawl

# Or use directly with npx
npx icecrawl --help
```

---

## Server Commands

### Start Dashboard + MCP Server (default)

```bash
icecrawl
```

- Launches **both** the Dashboard server and MCP server on port 6971 (by default).
- Access the dashboard at:  
  `http://localhost:6971/dashboard`
- MCP server will be available for integrations.

### Start only the Dashboard server

```bash
icecrawl dashboard
```

### Start only the MCP server

```bash
icecrawl mcp-server
```

---

## Scraping Commands

### Scrape a URL directly

```bash
icecrawl scrape url https://example.com
```

### Pipe a URL to the scraper

```bash
echo "https://example.com" | icecrawl scrape
```

### Pipe content from a file

```bash
cat urls.txt | icecrawl scrape
```

---

## Output Formats

| Option     | Alias | Description                                 | Default  |
| ---------- | ----- | ------------------------------------------- | -------- |
| `--format` | `-f`  | Output format (`pretty`, `json`, `minimal`) | `pretty` |
| `--silent` | `-s`  | Suppress progress messages                  | `false`  |

---

## Examples

### Basic scraping

```bash
icecrawl scrape url https://example.com
```

### JSON output (for programmatic use)

```bash
icecrawl scrape url https://example.com --format json > result.json
```

### Process multiple URLs from a file

```bash
cat > urls.txt << EOF
https://example.com
https://example.org
https://example.net
EOF

cat urls.txt | while read url; do
  icecrawl scrape url "$url" --format json >> results.json
done
```

### Silent operation (for scripts)

```bash
icecrawl scrape url https://example.com --silent --format json
```

---

## Integration Examples

### Extract all links from a webpage

```bash
icecrawl scrape url https://example.com --format json | jq -r '.data.content' | grep -o 'https://[^"]*'
```

### Combine with other CLI tools

```bash
icecrawl scrape url https://example.com --format json | jq -r '.data.content' | grep -o 'src="[^"]*"'
```

---

## Error Handling

The CLI tool will exit with a non-zero status code if an error occurs:

- Exit code 1: General error (invalid URL, network error, etc.)
