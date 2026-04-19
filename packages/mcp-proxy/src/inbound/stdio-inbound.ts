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

import type { ProxyHooks } from "../cli.js";
import type { ProxyCore } from "../core.js";
import type { Logger } from "../types.js";

/**
 * stdio inboundサーバーを起動
 * AIツールからのリクエストをUpstreamPool経由で転送する
 */
export const startStdioInbound = async (
  core: ProxyCore,
  logger: Logger,
  hooks?: ProxyHooks,
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

  // tools/call: upstreamにそのまま転送する（フック付き）
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const safeArgs = args ?? {};
    const startTime = Date.now();
    let isSuccess = true;
    let errorMessage: string | undefined;
    let resultContent: unknown[] = [];

    try {
      const result = await core.callTool(name, safeArgs);
      resultContent = result.content;

      if (result.isError) {
        isSuccess = false;
        // isError=trueの場合、contentからエラーメッセージを抽出
        const textContent = result.content.find(
          (c): c is { type: string; text: string } =>
            typeof c === "object" && c !== null && "type" in c && "text" in c,
        );
        errorMessage = textContent?.text;
      }

      return {
        content: result.content.map((c) => {
          // MCP SDKのコンテンツ型（text, image, audio, resource, resource_link）をそのまま返す
          if (typeof c === "object" && c !== null && "type" in c) {
            return c as Record<string, unknown>;
          }
          // 不明な形式はテキストに変換
          return { type: "text" as const, text: JSON.stringify(c) };
        }),
        isError: result.isError,
      };
    } catch (error) {
      isSuccess = false;
      errorMessage = error instanceof Error ? error.message : String(error);

      logger.error(`ツール "${name}" の実行に失敗しました`, {
        error: errorMessage,
        args: safeArgs,
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
    } finally {
      if (hooks?.onToolCall) {
        const durationMs = Date.now() - startTime;
        // フックは非同期でもfire-and-forget（ツール応答を遅延させない）
        // try-catchで同期throwも捕捉する
        try {
          Promise.resolve(
            hooks.onToolCall({
              prefixedToolName: name,
              args: safeArgs,
              durationMs,
              isSuccess,
              errorMessage,
              resultContent,
            }),
          ).catch((e: unknown) => {
            logger.error("ツール実行フックでエラーが発生しました", {
              error: e,
            });
          });
        } catch (e: unknown) {
          logger.error("ツール実行フックでエラーが発生しました", { error: e });
        }
      }
    }
  });

  const tools = await core.listTools();
  logger.info(`${tools.length}個のツールをstdio inboundに登録しました`);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  logger.info("stdio inboundサーバーを開始しました");
};
