#!/usr/bin/env node

/**
 * This is an MCP server that provides access to the Australian Bureau of Statistics (ABS) Data API.
 * It demonstrates core MCP concepts by providing:
 * - ABS datasets as resources
 * - Tools for querying specific datasets
 * - Prompts for analyzing statistical data
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import axios, { AxiosError } from "axios";

const ABS_API_BASE = "https://data.api.abs.gov.au/rest/data";

/**
 * Type definitions for ABS API responses
 */
type DatasetMetadata = {
  id: string;
  title: string;
  description: string;
};

type QueryParams = {
  datasetId: string;
  dimensions?: { [key: string]: string };
  format?: "json" | "csv";
};

/**
 * Cache for dataset metadata to avoid repeated API calls
 */
const datasetCache: { [id: string]: DatasetMetadata } = {};

/**
 * Create an MCP server with capabilities for ABS data access
 */
const server = new Server(
  {
    name: "ABS MCP Server",
    version: "0.1.0",
  },
  {
    capabilities: {
      resources: {},
      tools: {},
      prompts: {},
    },
  }
);

/**
 * Fetch and cache dataset metadata from ABS API
 */
async function fetchDatasets(): Promise<DatasetMetadata[]> {
  try {
    const response = await axios.get(`${ABS_API_BASE}/dataflows`);
    const datasets = response.data.data.map((item: any) => ({
      id: item.id,
      title: item.name,
      description: item.description || "No description available"
    }));
    
    // Update cache
    datasets.forEach((dataset: DatasetMetadata) => {
      datasetCache[dataset.id] = dataset;
    });
    
    return datasets;
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error fetching datasets:", error.message);
    }
    return [];
  }
}

/**
 * Handler for listing available ABS datasets as resources
 */
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  const datasets = await fetchDatasets();
  
  return {
    resources: datasets.map(dataset => ({
      uri: `abs:///${dataset.id}`,
      mimeType: "application/json",
      name: dataset.title,
      description: dataset.description
    }))
  };
});

/**
 * Handler for reading specific dataset contents
 */
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const url = new URL(request.params.uri);
  const datasetId = url.pathname.replace(/^\//, '');
  
  try {
    const response = await axios.get(`${ABS_API_BASE}/${datasetId}`);
    
    return {
      contents: [{
        uri: request.params.uri,
        mimeType: "application/json",
        text: JSON.stringify(response.data, null, 2)
      }]
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to fetch dataset ${datasetId}: ${error.message}`);
    }
    throw error;
  }
});

/**
 * Handler for listing available tools
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "query_dataset",
        description: "Query a specific ABS dataset with optional filters",
        parameters: {
          type: "object",
          required: ["datasetId"],
          properties: {
            datasetId: {
              type: "string",
              description: "ID of the dataset to query"
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
        parameters: {
          type: "object",
          properties: {}
        }
      }
    ]
  };
});

/**
 * Handler for tool calls
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, parameters } = request.params;

  switch (name) {
    case "query_dataset": {
      const params = parameters as QueryParams;
      try {
        const response = await axios.get(`${ABS_API_BASE}/${params.datasetId}`, {
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
      const datasets = await fetchDatasets();
      return { result: datasets };
    }
    
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

/**
 * Handler for listing available prompts
 */
server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: [{
      name: "analyze_dataset",
      description: "Generate analysis of ABS statistical data",
      parameters: {
        type: "object",
        required: ["datasetId"],
        properties: {
          datasetId: {
            type: "string",
            description: "ID of the dataset to analyze"
          }
        }
      }
    }]
  };
});

/**
 * Handler for getting prompt details
 */
server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  if (request.params.name !== "analyze_dataset") {
    throw new Error("Unknown prompt");
  }

  const params = request.params.parameters as { datasetId?: string } | undefined;
  const datasetId = params?.datasetId;
  if (!datasetId) {
    throw new Error("Dataset ID is required");
  }

  try {
    const response = await axios.get(`${ABS_API_BASE}/${datasetId}`);
    const dataset = datasetCache[datasetId];

    return {
      prompt: {
        text: "Analyze the following ABS statistical dataset and provide insights:",
        embeddedResources: [{
          uri: `abs:///${datasetId}`,
          mimeType: "application/json",
          text: JSON.stringify({
            metadata: dataset,
            data: response.data
          }, null, 2)
        }]
      }
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to fetch dataset for analysis: ${error.message}`);
    }
    throw error;
  }
});

/**
 * Start the server
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
