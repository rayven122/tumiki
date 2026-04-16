#!/usr/bin/env node
/**
 * --mcp-proxy CLIエントリーポイント
 * claude code → tumiki --mcp-proxy → MCPサーバーへの接続フロー
 *
 * configs は呼び出し元（desktop 側など）から動的に受け取る。
 * サーバー数に関わらず createProxyCore（ToolAggregator経由・prefix付き）を使用する。
 * desktop の --server <slug> オプションで渡す configs を絞り込むことで
 * 単体サーバーとして動作させる。
 */
import type { McpServerConfig, ToolCallHook } from "./types.js";
import { createProxyCore } from "./core.js";
import { startStdioInbound } from "./inbound/stdio-inbound.js";
import { stderrLogger as logger } from "./stderr-logger.js";

// プロキシ起動時に注入可能なフック
export type ProxyHooks = {
  onToolCall?: ToolCallHook;
};

export const runMcpProxy = async (
  configs: McpServerConfig[] = [],
  hooks?: ProxyHooks,
): Promise<void> => {
  logger.info("tumiki-mcp-proxy を起動しています...");

  const core = createProxyCore(configs, logger);

  // 全MCPサーバーに接続
  await core.startAll();

  // stdio inboundサーバーを起動（AIツールからのリクエストを受け付け）
  await startStdioInbound(core, logger, hooks);

  logger.info("tumiki-mcp-proxy の起動が完了しました");

  // シグナルでクリーンシャットダウン（SIGINT+SIGTERM同時受信の二重実行を防止）
  let shuttingDown = false;
  const shutdown = (): void => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info("シャットダウン中...");
    let exitCode = 0;
    void core
      .stopAll()
      .catch((error) => {
        logger.error("シャットダウン中にエラーが発生しました", error);
        exitCode = 1;
      })
      .finally(() => {
        process.exit(exitCode);
      });
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
};

// bin エントリーとして直接実行された場合のみ自動起動
// desktop の index.ts から動的importされた場合は runMcpProxy() を明示的に呼ぶため、ここではスキップ
// ESM環境: import.meta.url で判定、CJS環境（electron-viteバンドル時）: require.main === module で判定
const isDirectExecution =
  typeof require !== "undefined" && typeof module !== "undefined"
    ? require.main === module
    : process.argv[1] !== undefined &&
      new URL(import.meta.url).pathname ===
        new URL(process.argv[1], "file://").pathname;

if (isDirectExecution) {
  void runMcpProxy().catch((error: unknown) => {
    logger.error("起動に失敗しました", error);
    process.exit(1);
  });
}
