/**
 * MCP Server インスタンスを組み立てる（stdio / ローカル TCP 共通）
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import type { ProxyCore } from "../core.js";
import type { Logger } from "../types.js";

export const createMcpInboundServer = (
  core: ProxyCore,
  logger: Logger,
): Server => {
  const server = new Server(
    { name: "tumiki-proxy", version: "1.0.0" },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const tools = await core.listTools();
    return {
      tools: tools.map((t) => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema as Record<string, unknown>,
      })),
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
      const result = await core.callTool(name, args ?? {});
      return {
        content: result.content.map((c) => {
          if (typeof c === "object" && c !== null && "type" in c) {
            return c as Record<string, unknown>;
          }
          return { type: "text" as const, text: JSON.stringify(c) };
        }),
        isError: result.isError,
      };
    } catch (error) {
      logger.error(`ツール "${name}" の実行に失敗しました`, {
        error: error instanceof Error ? error.message : String(error),
        args,
      });
      return {
        content: [
          {
            type: "text" as const,
            text: `エラー: ${error instanceof Error ? error.message : "不明なエラー"}`,
          },
        ],
        isError: true,
      };
    }
  });

  return server;
};
