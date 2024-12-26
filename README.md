# ABS MCP Server

An MCP (Model Context Protocol) server that provides access to the Australian Bureau of Statistics (ABS) Data API. This server allows AI assistants to query and analyze ABS statistical data through the SDMX-ML API.

## Features

- Dynamic discovery of all available ABS datasets via SDMX-ML API
- Query ABS datasets with optional filters
- Support for multiple data formats (JSON, CSV, XML)
- Built on the MCP protocol for seamless integration with AI assistants
- Caching system for improved performance
- Comprehensive logging and error handling

## Installation

```bash
npm install
```

## Development

### Prerequisites

- Node.js 18 or higher
- npm 8 or higher

### Building

```bash
npm run build
```

### Running

```bash
npm start
```

### Development Tools

- `npm run build`: Build the TypeScript code
- `npm start`: Run the server
- `npm run inspector`: Run the MCP inspector for testing

## Project Structure

```
src/
├── index.ts                # Main server implementation
├── services/
│   └── abs/
│       ├── ABSApiClient.ts # ABS API communication
│       └── DataFlowService.ts # Data flow management and caching
├── types/
│   └── abs.ts             # TypeScript type definitions
└── utils/
    └── logger.ts          # Logging configuration
```

## Implementation Details

### ABS API Client

The `ABSApiClient` class handles communication with the ABS Data API:
- Uses SDMX-ML format for data exchange
- Supports multiple response formats (JSON, CSV, XML)
- Implements proper error handling and logging
- Configurable timeouts and retries

### Data Flow Service

The `DataFlowService` class manages ABS data flows:
- Dynamically fetches available datasets from ABS API
- Implements caching with configurable refresh intervals
- Provides methods for querying specific datasets
- Handles data transformation and formatting

### Logging

Comprehensive logging system using Winston:
- Debug-level logging for development
- Structured JSON logging format
- Console and file transport options
- Configurable log levels and formats

## Integration with Claude Desktop

1. Close Claude Desktop if it's running
2. Start the ABS MCP server: `npm start`
3. Start Claude Desktop
4. The ABS tools should appear in the "Available MCP Tools" window

## API Documentation

For more information about the ABS Data API:
- [SDMX-ML Documentation](https://data.gov.au/dataset/ds-dga-b1bc6077-dadd-4f61-9f8c-002ab2cdff10/details)
- [ABS API Documentation](https://api.gov.au/service/f8880c48-2927-4e48-9945-46d36c8c4e11)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License
