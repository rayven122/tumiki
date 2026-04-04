#!/usr/bin/env node
/**
 * --mcp-proxy CLIエントリーポイント
 * claude code → tumiki --mcp-proxy → Serena MCP の接続フロー
 */
import { createProxyCore, HARDCODED_CONFIGS } from "./core.js";
import { startStdioInbound } from "./inbound/stdio-inbound.js";
import { stderrLogger as logger } from "./stderr-logger.js";

export const runMcpProxy = async (): Promise<void> => {
  logger.info("tumiki-mcp-proxy を起動しています...");

  const core = createProxyCore(HARDCODED_CONFIGS, logger);

  // 全MCPサーバーに接続
  await core.startAll();

  // stdio inboundサーバーを起動（AIツールからのリクエストを受け付け）
  await startStdioInbound(core, logger);

  logger.info("tumiki-mcp-proxy の起動が完了しました");

  // シグナルでクリーンシャットダウン
  const shutdown = (): void => {
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

// mcp-cli.cjs として直接実行された場合のみ自動起動
// index.ts からの動的importでは二重実行を防ぐためスキップ
if (require.main === module) {
  void runMcpProxy().catch((error: unknown) => {
    logger.error("起動に失敗しました", error);
    process.exit(1);
  });
}
