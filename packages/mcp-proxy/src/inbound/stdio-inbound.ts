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
    let processedArgs = safeArgs;
    let filterContext: unknown = undefined;

    // pre-call フィルタ処理は try ブロック内に置き、block / フィルタ失敗時の早期 return も
    // finally に到達して onToolCall が確実に呼ばれるようにする（監査ログを必ず残すため）
    try {
      if (hooks?.filter) {
        try {
          const filtered = await hooks.filter.beforeCall(name, safeArgs);
          // block 判定の有無に関わらず context は保存（getDetectionSummary でサマリ取得）
          filterContext = filtered.context;
          if (filtered.blocked) {
            isSuccess = false;
            errorMessage = filtered.blocked.reason;
            resultContent = [
              { type: "text", text: `エラー: ${filtered.blocked.reason}` },
            ];
            return {
              content: [
                {
                  type: "text" as const,
                  text: `エラー: ${filtered.blocked.reason}`,
                },
              ],
              isError: true,
            };
          }
          processedArgs = filtered.args;
        } catch (e) {
          // フィルタ自体が落ちたら fail-close（PII 流出を防ぐためブロック側に倒す）
          isSuccess = false;
          errorMessage = `フィルタの実行に失敗しました: ${e instanceof Error ? e.message : String(e)}`;
          logger.error("ツール呼び出しフィルタの前処理でエラーが発生しました", {
            tool: name,
            error: errorMessage,
          });
          resultContent = [{ type: "text", text: `エラー: ${errorMessage}` }];
          return {
            content: [
              {
                type: "text" as const,
                text: `エラー: ${errorMessage}`,
              },
            ],
            isError: true,
          };
        }
      }

      const result = await core.callTool(name, processedArgs);

      // post-call フィルタ: result を変換（マスク済みトークンの復号等）
      // 失敗時はマスク済みのまま返す（fail-open）— 情報漏洩は発生しないため
      let finalResult = result;
      if (hooks?.filter) {
        try {
          finalResult = await hooks.filter.afterCall(filterContext, result);
        } catch (e) {
          logger.error(
            "ツール呼び出しフィルタの後処理でエラーが発生しました（マスク済みのまま返します）",
            {
              tool: name,
              error: e instanceof Error ? e.message : String(e),
            },
          );
        }
      }

      resultContent = finalResult.content;

      if (finalResult.isError) {
        isSuccess = false;
        // isError=trueの場合、contentからエラーメッセージを抽出
        const textContent = finalResult.content.find(
          (c): c is { type: string; text: string } =>
            typeof c === "object" && c !== null && "type" in c && "text" in c,
        );
        errorMessage = textContent?.text;
      }

      return {
        content: finalResult.content.map((c) => {
          // MCP SDKのコンテンツ型（text, image, audio, resource, resource_link）をそのまま返す
          if (typeof c === "object" && c !== null && "type" in c) {
            return c as Record<string, unknown>;
          }
          // 不明な形式はテキストに変換
          return { type: "text" as const, text: JSON.stringify(c) };
        }),
        isError: finalResult.isError,
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
        const clientInfo = server.getClientVersion();
        // フィルタ context から PII 検出サマリを取り出す（getDetectionSummary 実装時のみ）
        const piiDetections = hooks.filter?.getDetectionSummary
          ? hooks.filter.getDetectionSummary(filterContext)
          : undefined;
        // 検出があった場合のみマスク後 args を渡す（生 PII が DB に残らないよう、未検出時は省略）
        const maskedArgs = piiDetections ? processedArgs : undefined;
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
              clientName: clientInfo?.name,
              clientVersion: clientInfo?.version,
              piiDetections,
              piiPolicy: hooks.filter?.policy,
              maskedArgs,
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
