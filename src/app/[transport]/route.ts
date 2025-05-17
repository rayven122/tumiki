import { getClientTools } from "./proxy/mcp-proxy";
import {
  CallToolRequestSchema,
  CompatibilityCallToolResultSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import type { NextRequest } from "next/server";
import { createMcpHandler } from "./mcp-adapter";

const handler = async (request: NextRequest) => {
  // request header から apiKeyId を取得
  const bearerToken = request.headers.get("authorization");

  const apiKeyId = bearerToken?.split(" ")[1];
  console.log("apiKeyId", apiKeyId);

  if (!apiKeyId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { tools } = await getClientTools(apiKeyId);
  console.log("tools", tools);

  const mcpHandler = createMcpHandler(
    (server) => {
      // List Tools Handler
      server.setRequestHandler(ListToolsRequestSchema, async (request) => {
        // TODO: request の使い方
        // params: {
        //   _meta: request.params?._meta
        // }
        const allTools = tools.map((tool) => ({
          ...tool.tool,
          description: `[${tool.name}] ${tool.description}`,
        }));

        return {
          tools: allTools,
          _meta: {
            progressToken: request.params?._meta?.progressToken,
          },
        };
      });

      // Call Tool Handler
      // server.setRequestHandler(CallToolRequestSchema, async (request) => {
      //   const { name, arguments: args } = request.params;

      //   const tool = tools.find((tool) => tool.name === name);

      //   if (!tool) {
      //     throw new Error(`Unknown tool: ${name}`);
      //   }

      //   try {
      //     console.log("Forwarding tool call:", name);

      //     // Use the correct schema for tool calls
      //     return await tool.connectedClient.client.request(
      //       {
      //         method: "tools/call",
      //         params: {
      //           name,
      //           arguments: args ?? {},
      //           _meta: {
      //             progressToken: request.params._meta?.progressToken,
      //           },
      //         },
      //       },
      //       CompatibilityCallToolResultSchema,
      //     );
      //   } catch (error) {
      //     console.error(`Error calling tool through ${tool.name}:`, error);
      //     throw error;
      //   }
      // });
    },
    {
      // Optional server options
    },
    {
      // Optional configuration
      redisUrl: process.env.REDIS_URL,
      // Set the basePath to where the handler is to automatically derive all endpoints
      // This base path is for if this snippet is located at: /app/api/[transport]/route.ts
      // basePath: "/api",
      maxDuration: 60,
      verboseLogs: true,
    },
  );
  return mcpHandler(request);
};
export { handler as GET, handler as POST };
