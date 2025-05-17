import { createMcpHandler } from "@vercel/mcp-adapter";
import { getClientTools } from "./proxy/mcp-proxy";
import { CallToolResultSchema } from "@modelcontextprotocol/sdk/types.js";
import type { NextRequest } from "next/server";

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
      // その後、クライアントツールを取得して登録
      for (const tool of tools) {
        server.tool(tool.name, tool.description, {}, async (args) => {
          const result = await tool.connectedClient.client.request(
            {
              method: "tools/call",
              params: args,
            },
            CallToolResultSchema,
          );
          return result;
        });
      }
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
