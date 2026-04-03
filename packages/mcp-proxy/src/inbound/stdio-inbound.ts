/**
 * AIツールからのstdio接続を受け付けるMCPサーバー
 * --mcp-proxy モードで使用
 *
 * 低レベルServer APIを使用し、upstream MCPサーバーの
 * inputSchemaをそのままパススルーする（Zod変換不要）
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import type { ProxyCore } from "../core.js";
import type { Logger } from "../types.js";

/**
 * stdio inboundサーバーを起動
 * AIツールからのリクエストをUpstreamPool経由で転送する
 */
export const startStdioInbound = async (
  core: ProxyCore,
  logger: Logger,
): Promise<void> => {
  const server = new Server(
    { name: "tumiki-proxy", version: "1.0.0" },
    { capabilities: { tools: {} } },
  );

  // tools/list: upstreamのツール一覧をそのまま返す
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

  // tools/call: upstreamにそのまま転送する
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
      const result = await core.callTool(name, args ?? {});
      return {
        content: result.content.map((c) => {
          if (typeof c === "object" && c !== null && "type" in c) {
            return c as { type: "text"; text: string };
          }
          return { type: "text" as const, text: JSON.stringify(c) };
        }),
        isError: result.isError,
      };
    } catch (error) {
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

  const tools = await core.listTools();
  logger.info(`${tools.length}個のツールをstdio inboundに登録しました`);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  logger.info("stdio inboundサーバーを開始しました");
};
