# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Model Context Protocol (MCP) server that provides JSON schema generation capabilities using quicktype-core. The server exposes tools for analyzing JSON files and generating TypeScript types.

## Commands

### Development
- `npm run build` - Compile TypeScript to JavaScript in build/ directory and make executable
- `npm start` - Run the compiled MCP server
- `npm run inspect` - Run the server with MCP inspector for debugging

### Type Checking
- `npx tsc --noEmit` - Type check without emitting files

## Architecture

The project follows a simple MCP server architecture:

### Core Components
- **src/index.ts** - Main entry point that sets up the MCP server with stdio transport
- **McpServer** - Server instance configured with tools capability
- **quicktypeJSON function** - Core utility that converts JSON samples to TypeScript interfaces using quicktype-core

### Tools
- **json_schema** - Tool that reads JSON files and generates TypeScript type definitions

### Dependencies
- `@modelcontextprotocol/sdk` - MCP framework for building context-aware tools
- `quicktype-core` - JSON to type definition generator
- `zod` - Runtime type validation (imported but not currently used)

### Known Issues
- Line 45: Hardcoded path `@/test/tes.json` should be `test/test.json`
- Line 51: Typo in join separator `/n` should be `\n`

## File Structure
```
src/
  index.ts          # Main server implementation
test/
  test.json         # Large JSON test file (88k+ tokens)
build/              # Compiled output (gitignored)
```

The test.json file is extremely large and should be used carefully when testing the schema generation functionality.