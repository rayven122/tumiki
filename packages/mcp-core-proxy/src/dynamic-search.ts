import type { ToolAggregator } from "./outbound/tool-aggregator.js";
import type {
  CallToolResult,
  DynamicSearchOptions,
  McpToolInfo,
} from "./types.js";

export const DYNAMIC_SEARCH_TOOL_NAMES = {
  search: "search_tools",
  describe: "describe_tools",
  execute: "execute_tool",
} as const;

const asRecord = (value: unknown): Record<string, unknown> => {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
};

const toJsonTextResult = (value: unknown): CallToolResult => {
  return {
    content: [{ type: "text", text: JSON.stringify(value ?? null, null, 2) }],
    isError: false,
  };
};

export const dynamicSearchMetaTools = (): McpToolInfo[] => [
  {
    name: DYNAMIC_SEARCH_TOOL_NAMES.search,
    description: "Search available MCP tools by natural language.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string" },
        limit: { type: "number", minimum: 1, maximum: 50 },
      },
      required: ["query"],
      additionalProperties: false,
    },
  },
  {
    name: DYNAMIC_SEARCH_TOOL_NAMES.describe,
    description: "Return schemas for selected MCP tools.",
    inputSchema: {
      type: "object",
      properties: {
        toolNames: {
          type: "array",
          items: { type: "string" },
          minItems: 1,
        },
      },
      required: ["toolNames"],
      additionalProperties: false,
    },
  },
  {
    name: DYNAMIC_SEARCH_TOOL_NAMES.execute,
    description: "Execute a selected MCP tool by its prefixed tool name.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string" },
        arguments: { type: "object" },
      },
      required: ["name"],
      additionalProperties: false,
    },
  },
];

export const createDynamicSearchToolLayer = (
  aggregator: ToolAggregator,
  options?: DynamicSearchOptions,
): ToolAggregator => {
  if (!options?.enabled) return aggregator;

  const { provider } = options;

  return {
    listTools: async () => dynamicSearchMetaTools(),
    callTool: async (name: string, args: Record<string, unknown>) => {
      if (name === DYNAMIC_SEARCH_TOOL_NAMES.search) {
        const query = typeof args.query === "string" ? args.query.trim() : "";
        if (!query) {
          throw new Error("search_tools requires a non-empty query");
        }
        const limit = typeof args.limit === "number" ? args.limit : undefined;
        return toJsonTextResult(await provider.searchTools({ query, limit }));
      }

      if (name === DYNAMIC_SEARCH_TOOL_NAMES.describe) {
        const toolNames = Array.isArray(args.toolNames)
          ? args.toolNames.filter(
              (item): item is string => typeof item === "string",
            )
          : [];
        if (toolNames.length === 0) {
          throw new Error("describe_tools requires toolNames");
        }
        return toJsonTextResult(await provider.describeTools({ toolNames }));
      }

      if (name === DYNAMIC_SEARCH_TOOL_NAMES.execute) {
        const toolName = typeof args.name === "string" ? args.name.trim() : "";
        if (!toolName) {
          throw new Error("execute_tool requires name");
        }
        return aggregator.callTool(toolName, asRecord(args.arguments));
      }

      throw new Error(
        `Unknown dynamic search meta tool "${name}". Use search_tools, describe_tools, or execute_tool.`,
      );
    },
  };
};
