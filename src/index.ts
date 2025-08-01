#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { promises as fs } from 'fs';
import { resolve } from 'path';

import {
    quicktype,
    InputData,
    jsonInputForTargetLanguage,
    LanguageName,
    SerializedRenderResult
} from "quicktype-core";

// Define input validation schemas
const JsonSchemaInputSchema = z.object({
  filePath: z.string().min(1, "File path is required")
});

const JsonFilterInputSchema = z.object({
  filePath: z.string().min(1, "File path is required"),
  shape: z.any().describe("Shape object defining what to extract")
});

type JsonSchemaInput = z.infer<typeof JsonSchemaInputSchema>;
type JsonFilterInput = z.infer<typeof JsonFilterInputSchema>;
type Shape = { [key: string]: true | Shape };

// Define error types
interface JsonSchemaError {
  readonly type: 'file_not_found' | 'invalid_json' | 'quicktype_error' | 'validation_error';
  readonly message: string;
  readonly details?: unknown;
}

// Result type for better type safety
type JsonSchemaResult = {
  readonly success: true;
  readonly schema: string;
} | {
  readonly success: false;
  readonly error: JsonSchemaError;
};

type JsonFilterResult = {
  readonly success: true;
  readonly filteredData: any;
} | {
  readonly success: false;
  readonly error: JsonSchemaError;
};

// Create server instance
const server = new McpServer({
  name: "json-mcp",
  version: "1.0.0",
  capabilities: {
    resources: {},
    tools: {},
  },
});

async function quicktypeJSON(
  targetLanguage: LanguageName, 
  typeName: string, 
  jsonString: string
): Promise<SerializedRenderResult> {
  const jsonInput = jsonInputForTargetLanguage(targetLanguage);

  await jsonInput.addSource({
    name: typeName,
    samples: [jsonString]
  });

  const inputData = new InputData();
  inputData.addInput(jsonInput);

  return await quicktype({
    inputData,
    lang: targetLanguage
  });
}

/**
 * Extract data from object based on shape definition
 */
function extractWithShape(data: any, shape: Shape): any {
  if (Array.isArray(data)) {
    return data.map(item => extractWithShape(item, shape));
  }

  const result: any = {};
  for (const key in shape) {
    const rule = shape[key];
    if (rule === true) {
      result[key] = data[key];
    } else if (typeof rule === 'object' && data[key] !== undefined) {
      result[key] = extractWithShape(data[key], rule);
    }
  }
  return result;
}

/**
 * Validates and processes JSON schema generation request
 */
async function processJsonSchema(input: JsonSchemaInput): Promise<JsonSchemaResult> {
  try {
    // Resolve and validate file path
    const resolvedPath = resolve(input.filePath);
    
    // Check if file exists and read it
    let jsonContent: string;
    try {
      jsonContent = await fs.readFile(resolvedPath, 'utf-8');
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'file_not_found',
          message: `File not found: ${resolvedPath}`,
          details: error
        }
      };
    }

    // Validate JSON format
    try {
      JSON.parse(jsonContent);
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'invalid_json',
          message: 'Invalid JSON format in file',
          details: error
        }
      };
    }

    // Generate schema using quicktype with fixed parameters
    try {
      const result = await quicktypeJSON(
        "typescript", 
        "GeneratedType", 
        jsonContent
      );
      
      return {
        success: true,
        schema: result.lines.join('\n')
      };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'quicktype_error',
          message: 'Failed to generate schema',
          details: error
        }
      };
    }
  } catch (error) {
    return {
      success: false,
      error: {
        type: 'validation_error',
        message: 'Unexpected error during processing',
        details: error
      }
    };
  }
}

/**
 * Validates and processes JSON filter request
 */
async function processJsonFilter(input: JsonFilterInput): Promise<JsonFilterResult> {
  try {
    // Resolve and validate file path
    const resolvedPath = resolve(input.filePath);
    
    // Check if file exists and read it
    let jsonContent: string;
    try {
      jsonContent = await fs.readFile(resolvedPath, 'utf-8');
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'file_not_found',
          message: `File not found: ${resolvedPath}`,
          details: error
        }
      };
    }

    // Parse JSON
    let parsedData: any;
    try {
      parsedData = JSON.parse(jsonContent);
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'invalid_json',
          message: 'Invalid JSON format in file',
          details: error
        }
      };
    }

    // Apply shape filter
    try {
      const filteredData = extractWithShape(parsedData, input.shape);
      
      return {
        success: true,
        filteredData
      };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'validation_error',
          message: 'Failed to apply shape filter',
          details: error
        }
      };
    }
  } catch (error) {
    return {
      success: false,
      error: {
        type: 'validation_error',
        message: 'Unexpected error during processing',
        details: error
      }
    };
  }
}

// Register JSON schema tool
server.tool(
    "json_schema",
    "Generate TypeScript schema for a JSON file. Provide the file path as the only parameter.",
    {
        filePath: z.string().describe("JSON file path to generate schema")
    },
    async ({ filePath }) => {
        try {
            const validatedInput = JsonSchemaInputSchema.parse({
                filePath: filePath
            });
            const result = await processJsonSchema(validatedInput);
            
            if (result.success) {
                return {
                    content: [
                        {
                            type: "text",
                            text: result.schema
                        }
                    ]
                };
            } else {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Error: ${result.error.message}`
                        }
                    ],
                    isError: true
                };
            }
        } catch (error) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Validation error: ${error instanceof Error ? error.message : String(error)}`
                    }
                ],
                isError: true
            };
        }
    }
);

server.tool(
    "json_filter",
    "Filter JSON data using a shape object to extract only the fields you want. Provide filePath and shape parameters.",
    {
        filePath: z.string().describe("Path to the JSON file to filter"),
        shape: z.unknown().describe(`Shape object (formatted as valid JSON) defining what fields to extract. Use 'true' to include a field, or nested objects for deep extraction.

Examples:
1. Extract single field: {"type": true}
2. Extract multiple fields: {"type": true, "version": true, "source": true}
3. Extract nested fields: {"appState": {"gridSize": true, "viewBackgroundColor": true}}
4. Extract from arrays: {"elements": {"type": true, "x": true, "y": true}} - applies to each array item
5. Complex nested extraction: {
   "type": true,
   "version": true,
   "appState": {
     "gridSize": true,
     "viewBackgroundColor": true
   },
   "elements": {
     "type": true,
     "text": true,
     "x": true,
     "y": true,
     "boundElements": {
       "type": true,
       "id": true
     }
   }
}

Note: 
- Arrays are automatically handled - the shape is applied to each item in the array.
- Use json_schema tool to analyse the JSON file schema before using this tool.
`)
    },
    async ({ filePath, shape }) => {
        try {
            // If shape is a string, parse it as JSON
            let parsedShape = shape;
            if (typeof shape === 'string') {
                try {
                    parsedShape = JSON.parse(shape);
                } catch (e) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: `Error: Invalid JSON in shape parameter: ${e instanceof Error ? e.message : String(e)}`
                            }
                        ],
                        isError: true
                    };
                }
            }

            

            const validatedInput = JsonFilterInputSchema.parse({
                filePath,
                shape: parsedShape
            });
            
            const result = await processJsonFilter(validatedInput);
            
            if (result.success) {
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify(result.filteredData, null, 2)
                        }
                    ]
                };
            } else {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Error: ${result.error.message}`
                        }
                    ],
                    isError: true
                };
            }
        } catch (error) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Validation error: ${error instanceof Error ? error.message : String(error)}`
                    }
                ],
                isError: true
            };
        }
    }
);
  
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("JSON MCP Server running on stdio");
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});