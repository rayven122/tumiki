import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

import type { AuthConfig } from "../api/index.js";
import { GoogleCalendarClient } from "../api/index.js";
import { SERVER_INFO, TOOL_DESCRIPTIONS } from "./constants.js";
import { handleToolCall } from "./handlers.js";
import {
  CreateEventSchema,
  DeleteEventSchema,
  GetCalendarSchema,
  GetColorsSchema,
  GetEventSchema,
  GetFreeBusySchema,
  ListCalendarsSchema,
  ListEventsSchema,
  SearchEventsSchema,
  UpdateEventSchema,
} from "./types.js";

export const createServer = (config: AuthConfig): Server => {
  const server = new Server(SERVER_INFO, {
    capabilities: {
      tools: {},
    },
  });

  const client = new GoogleCalendarClient(config);

  // Initialize client on server start
  let isInitialized = false;
  const ensureInitialized = async () => {
    if (!isInitialized) {
      const result = await client.initialize();
      if (!result.ok) {
        throw result.error;
      }
      isInitialized = true;
    }
  };

  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    await ensureInitialized();
    return {
      tools: [
        {
          ...TOOL_DESCRIPTIONS.list_calendars,
          inputSchema: zodToJsonSchema(ListCalendarsSchema),
        },
        {
          ...TOOL_DESCRIPTIONS.get_calendar,
          inputSchema: zodToJsonSchema(GetCalendarSchema),
        },
        {
          ...TOOL_DESCRIPTIONS.list_events,
          inputSchema: zodToJsonSchema(ListEventsSchema),
        },
        {
          ...TOOL_DESCRIPTIONS.get_event,
          inputSchema: zodToJsonSchema(GetEventSchema),
        },
        {
          ...TOOL_DESCRIPTIONS.create_event,
          inputSchema: zodToJsonSchema(CreateEventSchema),
        },
        {
          ...TOOL_DESCRIPTIONS.update_event,
          inputSchema: zodToJsonSchema(UpdateEventSchema),
        },
        {
          ...TOOL_DESCRIPTIONS.delete_event,
          inputSchema: zodToJsonSchema(DeleteEventSchema),
        },
        {
          ...TOOL_DESCRIPTIONS.search_events,
          inputSchema: zodToJsonSchema(SearchEventsSchema),
        },
        {
          ...TOOL_DESCRIPTIONS.get_freebusy,
          inputSchema: zodToJsonSchema(GetFreeBusySchema),
        },
        {
          ...TOOL_DESCRIPTIONS.get_colors,
          inputSchema: zodToJsonSchema(GetColorsSchema),
        },
      ],
    };
  });

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    await ensureInitialized();

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
interface JsonSchema {
  type?: string | string[];
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  anyOf?: JsonSchema[];
  enum?: unknown[];
  default?: unknown;
  description?: string;
}

const zodToJsonSchema = (schema: z.ZodTypeAny): JsonSchema => {
  if (schema instanceof z.ZodObject) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const shape = schema.shape;
    const properties: Record<string, JsonSchema> = {};
    const required: string[] = [];

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    for (const [key, value] of Object.entries(shape)) {
      const fieldSchema = value as z.ZodTypeAny;
      properties[key] = zodToJsonSchema(fieldSchema);

      // Check if field is required
      if (!(fieldSchema instanceof z.ZodOptional)) {
        required.push(key);
      }

      // Add description if available
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (fieldSchema._def.description) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
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
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    return zodToJsonSchema(schema._def.innerType);
  }

  if (schema instanceof z.ZodDefault) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const inner = zodToJsonSchema(schema._def.innerType);

    inner.default = schema._def.defaultValue();
    return inner;
  }

  if (schema instanceof z.ZodArray) {
    return {
      type: "array",
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
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
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const types = schema._def.options.map(zodToJsonSchema);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    if (types.every((t: JsonSchema) => typeof t.type === "string")) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const simpleTypes = types.map((t: JsonSchema) => t.type as string);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      return { type: simpleTypes };
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    return { anyOf: types };
  }

  if (schema instanceof z.ZodEnum) {
    return {
      type: "string",
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      enum: schema._def.values,
    };
  }

  return { type: "string" };
};
