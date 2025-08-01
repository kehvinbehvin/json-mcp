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

type JsonSchemaInput = z.infer<typeof JsonSchemaInputSchema>;

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
  
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("JSON MCP Server running on stdio");
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});