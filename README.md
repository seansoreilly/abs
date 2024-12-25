# ABS MCP Server

An MCP server for accessing Australian Bureau of Statistics (ABS) data through the ABS Data API.

This TypeScript-based MCP server provides an interface to query and access ABS statistics data. It implements core MCP concepts by providing:

- Resources representing ABS datasets and datapoints
- Tools for querying specific datasets
- Prompts for analyzing and summarizing statistical data

## Features

### Resources
- Access ABS datasets via `abs://` URIs
- Browse available datasets and their metadata
- Retrieve specific datapoints and time series
- JSON and CSV data format support

### Tools
- `query_dataset` - Query specific ABS datasets
  - Filter by time period, region, and other parameters
  - Support for various data formats
- `list_datasets` - List available ABS datasets and their metadata

### Prompts
- `analyze_dataset` - Generate analysis of ABS statistical data
  - Includes dataset contents as embedded resources
  - Returns structured prompt for LLM analysis

## Development

Install dependencies:
```bash
npm install
```

Build the server:
```bash
npm run build
```

For development with auto-rebuild:
```bash
npm run watch
```

## Installation

To use with Claude Desktop, add the server config:

On MacOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
On Windows: `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "ABS MCP Server": {
      "command": "/path/to/ABS MCP Server/build/index.js"
    }
  }
}
```

### Debugging

Since MCP servers communicate over stdio, debugging can be challenging. We recommend using the [MCP Inspector](https://github.com/modelcontextprotocol/inspector), which is available as a package script:

```bash
npm run inspector
```

The Inspector will provide a URL to access debugging tools in your browser.

## ABS API Documentation

This server integrates with the ABS Data API. For more information about the API, visit:
https://www.abs.gov.au/about/data-services/application-programming-interfaces-apis/data-api-user-guide
