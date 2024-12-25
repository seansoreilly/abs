#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import axios from "axios";

// ABS API endpoints
const ABS_API_BASE = "https://api.data.abs.gov.au";

// Example datasets we know exist
const KNOWN_DATASETS = [
  {
    id: "ABS_ANNUAL_ERP_LGA2023",
    title: "Regional Population by LGA (2023)",
    description: "Estimated Resident Population by Local Government Area"
  },
  {
    id: "ABS_C21_T01_LGA",
    title: "2021 Census, Local Government Areas",
    description: "Selected Person Characteristics by Local Government Area"
  },
  {
    id: "ABS_REGIONAL_ASGS2016",
    title: "Regional Statistics by ASGS 2016",
    description: "Various indicators by Statistical Area Level 2 (SA2)"
  }
];

// Enable debug logging
const debug = true;
function log(...args: any[]) {
  if (debug) {
    console.error('[ABS MCP Server]', ...args);
  }
}

// Define parameter types
type QueryDatasetParams = {
  datasetId: string;
  dimensions?: Record<string, string>;
  format?: "json" | "csv";
};

type ListDatasetsParams = Record<string, never>;

const server = new Server(
  {
    name: "abs-mcp-server",
    version: "0.1.0",
    description: "Access Australian Bureau of Statistics (ABS) data"
  },
  {
    capabilities: {
      tools: {
        list: true,
        call: true
      }
    }
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  log('Listing tools');
  return {
    tools: [
      {
        name: "query_dataset",
        description: "Query a specific ABS dataset with optional filters",
        inputSchema: {
          type: "object",
          required: ["datasetId"],
          properties: {
            datasetId: {
              type: "string",
              description: "ID of the dataset to query (e.g., ABS_ANNUAL_ERP_LGA2023)",
              enum: KNOWN_DATASETS.map(d => d.id)
            },
            dimensions: {
              type: "object",
              description: "Optional dimension filters",
              additionalProperties: { type: "string" }
            },
            format: {
              type: "string",
              enum: ["json", "csv"],
              default: "json",
              description: "Response format"
            }
          }
        }
      },
      {
        name: "list_datasets",
        description: "List available ABS datasets and their metadata",
        inputSchema: {
          type: "object",
          properties: {}
        }
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, parameters } = request.params;
  log('Tool call:', name, parameters);

  switch (name) {
    case "query_dataset": {
      const params = parameters as QueryDatasetParams;
      try {
        const response = await axios.get(`${ABS_API_BASE}/data/${params.datasetId}/all`, {
          params: {
            format: params.format || "json",
            ...params.dimensions
          }
        });
        return { result: response.data };
      } catch (error) {
        if (error instanceof Error) {
          throw new Error(`Failed to query dataset: ${error.message}`);
        }
        throw error;
      }
    }
    
    case "list_datasets": {
      return { result: KNOWN_DATASETS };
    }
    
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

// Start the server
async function main() {
  log('Starting ABS MCP Server...');
  
  const transport = new StdioServerTransport();
  
  log('Connecting to transport...');
  try {
    await server.connect(transport);
    log('Server ready to handle requests');
  } catch (error) {
    log('Failed to connect:', error);
    throw error;
  }
}

process.on('uncaughtException', (error: Error) => {
  log('Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (error: Error) => {
  log('Unhandled rejection:', error);
  process.exit(1);
});

main().catch((error) => {
  log("Server error:", error);
  process.exit(1);
});
