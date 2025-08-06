# JSON MCP Filter

A Model Context Protocol (MCP) server that provides JSON schema generation and filtering tools. This server uses [quicktype](https://github.com/quicktype/quicktype) to convert JSON samples into TypeScript type definitions and offers JSON data filtering capabilities.

Particulary helpful for JSON files that are on the larger side which contains data you don't want included in your LLM context.

<a href="https://glama.ai/mcp/servers/@kehvinbehvin/json-mcp">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/@kehvinbehvin/json-mcp/badge" alt="JSON Server MCP server" />
</a>

## Features

- **JSON Schema Generation**: Convert JSON files into TypeScript type definitions using quicktype-core
- **JSON Filtering**: Extract specific fields from JSON data using shape-based filtering
- **MCP Integration**: Seamlessly integrates with Claude Desktop and Claude Code
- **Type Safety**: Built with TypeScript and includes comprehensive error handling

## Tools Provided

### `json_schema`
Generates TypeScript type definitions from JSON files.

**Parameters:**
- `filePath`: Path to the JSON file to analyze

**Example:**
```json
{"name": "John", "age": 30, "city": "New York"}
```
Generates TypeScript interfaces with proper typing.

### `json_filter`
Extracts specific fields from JSON data using a shape definition.

**Parameters:**
- `filePath`: Path to the JSON file to filter
- `shape`: Shape object defining which fields to extract

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
```

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
  index.ts          # Main server implementation with tools
test/
  test.json         # Sample JSON file for testing
build/              # Compiled TypeScript output
```

## Error Handling

The server includes error handling for:
- File not found errors
- Invalid JSON format
- Quicktype processing errors
- Shape filtering errors