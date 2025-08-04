# JSON MCP Filter

A Model Context Protocol (MCP) server that provides JSON schema generation and filtering tools for both local files and remote HTTP/HTTPS endpoints. This server uses [quicktype](https://github.com/quicktype/quicktype) to convert JSON samples into TypeScript type definitions and offers JSON data filtering capabilities.

Particularly helpful for JSON files that are on the larger side which contains data you don't want included in your LLM context. Perfect for filtering API responses and extracting only relevant data.

## Features

- **JSON Schema Generation**: Convert JSON files into TypeScript type definitions using quicktype-core
- **JSON Filtering**: Extract specific fields from JSON data using shape-based filtering
- **Remote File Support**: Fetch and process JSON from HTTP/HTTPS URLs and APIs
- **Content Size Protection**: Automatic handling of large responses (up to 50MB)
- **MCP Integration**: Seamlessly integrates with Claude Desktop and Claude Code
- **Type Safety**: Built with TypeScript and includes comprehensive error handling
- **Enhanced Error Messages**: Clear, actionable error messages for common issues

## Tools Provided

### `json_schema`
Generates TypeScript type definitions from JSON files or remote URLs.

**Parameters:**
- `filePath`: Local file path or HTTP/HTTPS URL to the JSON data

**Examples:**

*Local file:*
```bash
json_schema({ filePath: "./data.json" })
```

*Remote JSON file:*
```bash
json_schema({ filePath: "https://api.example.com/config.json" })
```

*API endpoint:*
```bash
json_schema({ filePath: "https://jsonplaceholder.typicode.com/users" })
```

**Sample Input:**
```json
{"name": "John", "age": 30, "city": "New York"}
```

**Sample Output:**
```typescript
export interface GeneratedType {
    name: string;
    age:  number;
    city: string;
}
```

### `json_filter`
Extracts specific fields from JSON data using a shape definition. Perfect for filtering large API responses to include only relevant data.

**Parameters:**
- `filePath`: Local file path or HTTP/HTTPS URL to the JSON data
- `shape`: Shape object defining which fields to extract

### `json_dry_run`
Naive size breakdown of JSON data using a shape object to determine granularity. Returns size information in bytes for each specified field, mirroring the shape structure but with size values instead of data.

**Parameters:**
- `filePath`: Local file path or HTTP/HTTPS URL to the JSON data
- `shape`: Shape object defining what to analyze for size

**Use Cases:**
- Determine data size before filtering large JSON files
- Optimize API response filtering by understanding field sizes
- Analyze storage requirements for specific data structures
- Compare relative sizes of different JSON sections

**Examples:**

*Analyze data size:*
```bash
json_dry_run({
  filePath: "https://api.example.com/users",
  shape: {"name": true, "email": true, "posts": {"title": true}}
})
```

**Sample Output:**
```
Total file size: 245.8 KB (251,847 bytes)

Size breakdown:
{
  "name": 1205,
  "email": 1834, 
  "posts": {
    "title": 5692
  }
}
```

## `json_filter` Examples

*Filter API response:*
```bash
json_filter({ 
  filePath: "https://jsonplaceholder.typicode.com/users",
  shape: {"name": true, "email": true, "address": {"city": true}}
})
```

*Filter local file:*
```bash
json_filter({
  filePath: "./large-dataset.json", 
  shape: {"users": {"id": true, "name": true}}
})
```

**Shape Examples:**
```javascript
// Extract single field
{"name": true}

// Extract multiple fields  
{"name": true, "age": true}

// Extract nested fields
{"user": {"name": true, "email": true}}

// Extract from arrays (applies to each item)
{"users": {"name": true, "age": true}}

// Complex nested extraction
{
  "results": {
    "name": {"first": true, "last": true},
    "email": true,
    "location": {"city": true, "country": true}
  }
}
```

## ⚠️ Security Disclaimer

**IMPORTANT: Remote Data Fetching**

This tool can fetch data from remote HTTP/HTTPS URLs. Users are responsible for:

- **Verifying URLs before submission** - Ensure URLs point to legitimate, safe endpoints
- **Data validation** - Review data sources and content before processing  
- **Rate limiting** - Respect API rate limits and terms of service of external services
- **Content safety** - This tool does not validate the safety or appropriateness of remote content

**The repository maintainers are not responsible for:**
- Data fetched from external URLs
- Privacy implications of remote requests  
- Malicious or inappropriate content from third-party sources
- API abuse or violations of third-party terms of service

**Recommendations:**
- Only use trusted, public APIs and data sources
- Verify URLs are legitimate before processing
- Be cautious with internal/localhost URLs in shared environments
- Review API documentation and terms of service before use

## Installation

### Quick Start (Recommended)

```bash
# Using npx (no installation required)
npx json-mcp-filter@latest

# Or install globally
npm install -g json-mcp-filter@latest
json-mcp-server
```

### From Source

1. Clone this repository:
```bash
git clone <repository-url>
cd json-mcp-filter
```

2. Install dependencies:
```bash
npm install
```

3. Build the server:
```bash
npm run build
```

## Setup for Claude Desktop

Add this server to your Claude Desktop configuration file:

### macOS
```json
{
  "mcpServers": {
    "json-mcp-filter": {
      "command": "node",
      "args": ["/path/to/json-mcp-filter/build/index.js"]
    }
  }
}
```

## Setup for Claude Code

Add this server to your Claude Code MCP settings:

Add a new server with:
   - **Name**: `json-mcp-filter`
   - **Command**: `node`
   - **Args**: `["/path/to/json-mcp-filter/build/index.js"]`


Or, use the `npx` method for easier setup:
```json
{
  "mcpServers": {
    "json-mcp-filter": {
      "command": "npx",
      "args": ["-y", "json-mcp-filter@latest"]
    }
  }
}
```
Or
claude mcp add json-mcp-filter node /path/to/json-mcp-filter/build/index.js

## Development

### Scripts
- `npm run build` - Compile TypeScript and make executable
- `npm run start` - Run the compiled server
- `npm run inspect` - Run with MCP inspector for debugging
- `npx tsc --noEmit` - Type check without emitting files

### Testing
Test the server using the MCP inspector:
```bash
npm run inspect
```

This will start the server with the MCP inspector interface for interactive testing.

## Project Structure

```
src/
  index.ts                    # Main server implementation with tools
  strategies/                 # Strategy pattern for data ingestion
    JsonIngestionStrategy.ts  # Abstract strategy interface
    LocalFileStrategy.ts      # Local file system access
    HttpJsonStrategy.ts       # HTTP/HTTPS URL fetching
  context/
    JsonIngestionContext.ts   # Strategy management and selection
  types/
    JsonIngestion.ts          # Shared type definitions
test/
  test.json                   # Sample JSON files for testing
build/                        # Compiled TypeScript output
```

## Error Handling

The server includes comprehensive error handling for:

### Local File Errors
- File not found errors
- Invalid JSON format
- File permission issues

### Remote URL Errors  
- **Network errors** - Connection failures, timeouts
- **Authentication errors** - 401/403 responses with guidance
- **Server errors** - 500-series responses with retry suggestions
- **Content size errors** - Automatic rejection of responses over 50MB
- **Format errors** - Non-JSON content with format-specific guidance
- **Rate limiting** - 429 responses with wait instructions

### Processing Errors
- Quicktype processing errors
- Shape filtering errors
- Invalid URL format errors

All errors include actionable messages and debugging information to help resolve issues quickly.

## Performance & File Size Handling

### Expected Performance

The JSON MCP tools are optimized for real-world JSON processing with the following performance characteristics:

| File Size | Processing Time |
|-----------|-----------------|
| < 100 KB | < 10ms |
| 100 KB - 1 MB | 10ms - 100ms |
| 1 MB - 10 MB | 100ms - 1s |
| 10 MB - 50 MB | 1s - 5s |
| > 50 MB | Blocked |

### Built-in File Size Protection

**Automatic Size Limits:**
- **50 MB maximum** for both local files and remote URLs
- **Pre-download checking** via HTTP Content-Length headers
- **Post-download validation** for responses without size headers

**Size Limit Enforcement:**

*Local Files:*
```bash
# File size checked before reading
json_schema({ filePath: "./huge-file.json" })
# → Error: File too large (75MB). This tool is optimized for JSON files under 50MB.
```

*Remote URLs:*
```bash  
# Content-Length header checked before download
json_filter({ filePath: "https://api.example.com/massive-dataset" })
# → Error: Response too large (120MB). This tool is optimized for JSON files under 50MB.
```

**Size Information:**
- All tools display actual file sizes in responses
- `json_schema` shows file size at the top of generated schemas
- `json_dry_run` provides detailed size breakdowns for optimization
- Clear error messages show actual vs. maximum allowed sizes

### Performance Recommendations

**For Best Performance:**
- Use `json_dry_run` first to analyze large files
- Filter data with `json_filter` before generating schemas
- Limit shape specifications to essential fields only
- Process large datasets in smaller chunks when possible

## Remote Data Capabilities

### Supported Sources
- **Public APIs** - REST endpoints returning JSON data
- **Static JSON files** - JSON files hosted on web servers  
- **Local development** - `http://localhost` endpoints during development

### Content Size Management
- **Automatic detection** - Checks Content-Length headers before download
- **Memory protection** - Prevents downloading files larger than 50MB
- **Progress indication** - Clear error messages showing actual vs. maximum size
- **Streaming safety** - Validates content size after download for headers without Content-Length

### Common Use Cases

**For LLMs:**
- Filter large API responses to extract only relevant data
- Generate schemas from public API endpoints for integration
- Process configuration files from remote sources
- Analyze sample data from documentation URLs

**For Development:**
- Extract TypeScript types from API documentation examples
- Filter test data from development APIs
- Process JSON configurations from remote repositories
- Analyze third-party API response structures

**Example Workflow:**
1. LLM calls an API and gets a large response
2. Uses `json_filter` to extract only needed fields
3. Processes clean, relevant data without noise
4. Generates schemas with `json_schema` for type safety