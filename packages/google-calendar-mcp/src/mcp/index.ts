import type { z } from "zod";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { zodToJsonSchema } from "zod-to-json-schema";

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
          inputSchema: convertZodToJsonSchema(ListCalendarsSchema),
        },
        {
          ...TOOL_DESCRIPTIONS.get_calendar,
          inputSchema: convertZodToJsonSchema(GetCalendarSchema),
        },
        {
          ...TOOL_DESCRIPTIONS.list_events,
          inputSchema: convertZodToJsonSchema(ListEventsSchema),
        },
        {
          ...TOOL_DESCRIPTIONS.get_event,
          inputSchema: convertZodToJsonSchema(GetEventSchema),
        },
        {
          ...TOOL_DESCRIPTIONS.create_event,
          inputSchema: convertZodToJsonSchema(CreateEventSchema),
        },
        {
          ...TOOL_DESCRIPTIONS.update_event,
          inputSchema: convertZodToJsonSchema(UpdateEventSchema),
        },
        {
          ...TOOL_DESCRIPTIONS.delete_event,
          inputSchema: convertZodToJsonSchema(DeleteEventSchema),
        },
        {
          ...TOOL_DESCRIPTIONS.search_events,
          inputSchema: convertZodToJsonSchema(SearchEventsSchema),
        },
        {
          ...TOOL_DESCRIPTIONS.get_freebusy,
          inputSchema: convertZodToJsonSchema(GetFreeBusySchema),
        },
        {
          ...TOOL_DESCRIPTIONS.get_colors,
          inputSchema: convertZodToJsonSchema(GetColorsSchema),
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

// Convert Zod schema to JSON Schema using the official library
const convertZodToJsonSchema = (schema: z.ZodTypeAny) => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
  return zodToJsonSchema(schema as any, {
    target: "openApi3",
    $refStrategy: "none",
  });
};
