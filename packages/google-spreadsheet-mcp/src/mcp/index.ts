import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

import type { AuthConfig, GoogleSheetsClient } from "../api/index.js";
import { createGoogleSheetsClient } from "../api/index.js";
import { SERVER_INFO, TOOL_DESCRIPTIONS } from "./constants.js";
import { handleToolCall } from "./handlers.js";
import {
  AppendRowsSchema,
  BatchUpdateCellsSchema,
  ClearRangeSchema,
  CreateSheetSchema,
  CreateSpreadsheetSchema,
  DeleteSheetSchema,
  GetPermissionsSchema,
  GetSheetDataSchema,
  GetSpreadsheetSchema,
  ListSheetsSchema,
  ListSpreadsheetsSchema,
  RemovePermissionSchema,
  ShareSpreadsheetSchema,
  UpdateCellsSchema,
} from "./types.js";

export const createServer = (config: AuthConfig): Server => {
  const server = new Server(SERVER_INFO, {
    capabilities: {
      tools: {},
    },
  });

  let client: GoogleSheetsClient | null = null;

  // Initialize client on server start
  const ensureInitialized = async () => {
    if (!client) {
      const result = await createGoogleSheetsClient(config);
      if (!result.ok) {
        throw result.error;
      }
      client = result.value;
    }
  };

  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    await ensureInitialized();
    return {
      tools: [
        {
          ...TOOL_DESCRIPTIONS.list_spreadsheets,
          inputSchema: zodToJsonSchema(ListSpreadsheetsSchema),
        },
        {
          ...TOOL_DESCRIPTIONS.get_spreadsheet,
          inputSchema: zodToJsonSchema(GetSpreadsheetSchema),
        },
        {
          ...TOOL_DESCRIPTIONS.create_spreadsheet,
          inputSchema: zodToJsonSchema(CreateSpreadsheetSchema),
        },
        {
          ...TOOL_DESCRIPTIONS.list_sheets,
          inputSchema: zodToJsonSchema(ListSheetsSchema),
        },
        {
          ...TOOL_DESCRIPTIONS.create_sheet,
          inputSchema: zodToJsonSchema(CreateSheetSchema),
        },
        {
          ...TOOL_DESCRIPTIONS.delete_sheet,
          inputSchema: zodToJsonSchema(DeleteSheetSchema),
        },
        {
          ...TOOL_DESCRIPTIONS.get_sheet_data,
          inputSchema: zodToJsonSchema(GetSheetDataSchema),
        },
        {
          ...TOOL_DESCRIPTIONS.update_cells,
          inputSchema: zodToJsonSchema(UpdateCellsSchema),
        },
        {
          ...TOOL_DESCRIPTIONS.batch_update_cells,
          inputSchema: zodToJsonSchema(BatchUpdateCellsSchema),
        },
        {
          ...TOOL_DESCRIPTIONS.append_rows,
          inputSchema: zodToJsonSchema(AppendRowsSchema),
        },
        {
          ...TOOL_DESCRIPTIONS.clear_range,
          inputSchema: zodToJsonSchema(ClearRangeSchema),
        },
        {
          ...TOOL_DESCRIPTIONS.share_spreadsheet,
          inputSchema: zodToJsonSchema(ShareSpreadsheetSchema),
        },
        {
          ...TOOL_DESCRIPTIONS.get_permissions,
          inputSchema: zodToJsonSchema(GetPermissionsSchema),
        },
        {
          ...TOOL_DESCRIPTIONS.remove_permission,
          inputSchema: zodToJsonSchema(RemovePermissionSchema),
        },
      ],
    };
  });

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    await ensureInitialized();

    if (!client) {
      return {
        content: [
          {
            type: "text",
            text: "Error: Client not initialized",
          },
        ],
        isError: true,
      };
    }

    const result = await handleToolCall(client, request);

    if (!result.ok) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${result.error.message}`,
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result.value, null, 2),
        },
      ],
    };
  });

  return server;
};

export const runServer = async (config: AuthConfig): Promise<void> => {
  const server = createServer(config);
  const transport = new StdioServerTransport();

  await server.connect(transport);
  console.error(`${SERVER_INFO.name} v${SERVER_INFO.version} running`);
};

// Helper function to convert Zod schema to JSON Schema
type JsonSchema = {
  type?: string | string[];
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  anyOf?: JsonSchema[];
  enum?: unknown[];
  default?: unknown;
  description?: string;
};

const zodToJsonSchema = (schema: z.ZodTypeAny): JsonSchema => {
  if (schema instanceof z.ZodObject) {
    const shape = schema.shape;
    const properties: Record<string, JsonSchema> = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(shape)) {
      const fieldSchema = value as z.ZodTypeAny;
      properties[key] = zodToJsonSchema(fieldSchema);

      // Check if field is required
      if (!(fieldSchema instanceof z.ZodOptional)) {
        required.push(key);
      }

      // Add description if available
      if (fieldSchema._def.description) {
        properties[key].description = fieldSchema._def.description;
      }
    }

    return {
      type: "object",
      properties,
      required: required.length > 0 ? required : undefined,
    };
  }

  if (schema instanceof z.ZodOptional) {
    return zodToJsonSchema(schema._def.innerType);
  }

  if (schema instanceof z.ZodDefault) {
    const inner = zodToJsonSchema(schema._def.innerType);
    inner.default = schema._def.defaultValue();
    return inner;
  }

  if (schema instanceof z.ZodArray) {
    return {
      type: "array",
      items: zodToJsonSchema(schema._def.type),
    };
  }

  if (schema instanceof z.ZodString) {
    return { type: "string" };
  }

  if (schema instanceof z.ZodNumber) {
    return { type: "number" };
  }

  if (schema instanceof z.ZodBoolean) {
    return { type: "boolean" };
  }

  if (schema instanceof z.ZodNull) {
    return { type: "null" };
  }

  if (schema instanceof z.ZodUnion) {
    const types = schema._def.options.map(zodToJsonSchema);
    if (types.every((t: JsonSchema) => typeof t.type === "string")) {
      const simpleTypes = types.map((t: JsonSchema) => t.type as string);
      return { type: simpleTypes };
    }
    return { anyOf: types };
  }

  if (schema instanceof z.ZodEnum) {
    return {
      type: "string",
      enum: schema._def.values,
    };
  }

  return { type: "string" };
};
