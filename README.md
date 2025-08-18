# JSON MCP Filter

A powerful Model Context Protocol (MCP) server that provides JSON schema generation and filtering tools for local files and remote HTTP/HTTPS endpoints. Built with [quicktype](https://github.com/quicktype/quicktype) for robust TypeScript type generation.

[![Trust Score](https://archestra.ai/mcp-catalog/api/badge/quality/kehvinbehvin/json-mcp-filter)](https://archestra.ai/mcp-catalog/kehvinbehvin__json-mcp-filter)
<a href="https://glama.ai/mcp/servers/@kehvinbehvin/json-mcp">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/@kehvinbehvin/json-mcp/badge" alt="JSON Server MCP server" />

**Perfect for**: Filtering large JSON files and API responses to extract only relevant data for LLM context, while maintaining type safety.


## ✨ Key Features

- 🔄 **Schema Generation** - Convert JSON to TypeScript interfaces using quicktype
- 🎯 **Smart Filtering** - Extract specific fields with shape-based filtering  
- 🌐 **Remote Support** - Works with HTTP/HTTPS URLs and API endpoints
- 📦 **Auto Chunking** - Handles large datasets with automatic 400KB chunking
- 🛡️ **Size Protection** - Built-in 50MB limit with memory safety
- ⚡ **MCP Ready** - Seamless integration with Claude Desktop and Claude Code
- 🚨 **Smart Errors** - Clear, actionable error messages with debugging info

## 🛠️ Available Tools

### `json_schema`

Generates TypeScript interfaces from JSON data.

**Parameters:**
- `filePath`: Local file path or HTTP/HTTPS URL

**Example:**
```javascript
// Input JSON
{"name": "John", "age": 30, "city": "New York"}

// Generated TypeScript
export interface GeneratedType {
    name: string;
    age:  number;
    city: string;
}
```

### `json_filter`

Extracts specific fields using shape-based filtering with automatic chunking for large datasets.

**Parameters:**
- `filePath`: Local file path or HTTP/HTTPS URL
- `shape`: Object defining which fields to extract
- `chunkIndex` (optional): Chunk index for large datasets (0-based)

**Auto-Chunking:**
- ≤400KB: Returns all data
- >400KB: Auto-chunks with metadata

### `json_dry_run`

Analyzes data size and provides chunking recommendations before filtering.

**Parameters:**
- `filePath`: Local file path or HTTP/HTTPS URL  
- `shape`: Object defining what to analyze

**Returns:** Size breakdown and chunk recommendations

## 📋 Usage Examples

### Basic Filtering
```javascript
// Simple field extraction
json_filter({
  filePath: "https://api.example.com/users",
  shape: {"name": true, "email": true}
})
```

### Shape Patterns
```javascript
// Single field
{"name": true}

// Nested objects
{"user": {"name": true, "email": true}}

// Arrays (applies to each item)
{"users": {"name": true, "age": true}}

// Complex nested
{
  "results": {
    "profile": {"name": true, "location": {"city": true}}
  }
}
```

### Large Dataset Workflow
```javascript
// 1. Check size first
json_dry_run({filePath: "./large.json", shape: {"users": {"id": true}}})
// → "Recommended chunks: 6"

// 2. Get chunks
json_filter({filePath: "./large.json", shape: {"users": {"id": true}}})
// → Chunk 0 + metadata

json_filter({filePath: "./large.json", shape: {"users": {"id": true}}, chunkIndex: 1})
// → Chunk 1 + metadata
```

## 🔒 Security Notice

**Remote Data Fetching**: This tool fetches data from HTTP/HTTPS URLs. Users are responsible for:

✅ **Safe Practices:**
- Verify URLs point to legitimate endpoints
- Use trusted, public APIs only
- Respect API rate limits and terms of service
- Review data sources before processing

❌ **Maintainers Not Responsible For:**
- External URL content
- Privacy implications of remote requests
- Third-party API abuse or violations

💡 **Recommendation**: Only use trusted, public data sources.

## 🚀 Quick Start

### Option 1: NPX (Recommended)
```bash
# No installation required
npx json-mcp-filter@latest
```

### Option 2: Global Install
```bash
npm install -g json-mcp-filter@latest
json-mcp-server
```

### Option 3: From Source
```bash
git clone <repository-url>
cd json-mcp-filter
npm install
npm run build
```

## ⚙️ MCP Integration

### Claude Desktop

Add to your configuration file:

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

### Claude Code

```bash
# Add via CLI
claude mcp add json-mcp-filter npx -y json-mcp-filter@latest
```

Or add manually:
- **Name**: `json-mcp-filter`
- **Command**: `npx`
- **Args**: `["-y", "json-mcp-filter@latest"]`

## 🔧 Development

### Commands
```bash
npm run build      # Compile TypeScript
npm run start      # Run compiled server  
npm run inspect    # Debug with MCP inspector
npx tsc --noEmit   # Type check only
```

### Testing
```bash
npm run inspect    # Interactive testing interface
```

## 📁 Project Structure

```
src/
├── index.ts                    # Main server + tools
├── strategies/                 # Data ingestion strategies
│   ├── JsonIngestionStrategy.ts  # Abstract interface
│   ├── LocalFileStrategy.ts      # Local file access
│   └── HttpJsonStrategy.ts       # HTTP/HTTPS fetching
├── context/
│   └── JsonIngestionContext.ts   # Strategy management
└── types/
    └── JsonIngestion.ts          # Type definitions
```

## 🚨 Error Handling

### Comprehensive Coverage
- **Local Files**: Not found, permissions, invalid JSON
- **Remote URLs**: Network failures, auth errors (401/403), server errors (500+)
- **Content Size**: Auto-reject >50MB with clear messages
- **Format Detection**: Smart detection of HTML/XML with guidance
- **Rate Limiting**: 429 responses with retry instructions
- **Processing**: Quicktype errors, shape filtering issues

**All errors include actionable debugging information.**

## ⚡ Performance

### Processing Times
| File Size | Processing Time |
|-----------|-----------------|
| < 100 KB  | < 10ms         |
| 1-10 MB   | 100ms - 1s     |
| 10-50 MB  | 1s - 5s        |
| > 50 MB   | **Blocked**    |

### Size Protection
- **50MB maximum** for all sources
- **Pre-download checking** via Content-Length
- **Memory safety** prevents OOM errors
- **Clear error messages** with actual vs. limit sizes

### Best Practices
- Use `json_dry_run` first for large files
- Filter with `json_filter` before schema generation
- Focus shapes on essential fields only

## 🌐 Supported Sources

- **Public APIs** - REST endpoints with JSON responses
- **Static Files** - JSON files on web servers
- **Local Dev** - `http://localhost` during development
- **Local Files** - File system access

## 💡 Common Workflows

**LLM Integration:**
1. API returns large response
2. `json_filter` extracts relevant fields
3. Process clean data without noise
4. `json_schema` generates types for safety