#!/usr/bin/env node
/**
 * --mcp-proxy CLIエントリーポイント
 * claude code → tumiki --mcp-proxy → Serena MCP の接続フロー
 */
import { createProxyCore, HARDCODED_CONFIGS } from "./core";
import { startStdioInbound } from "./stdio-inbound";
import { stderrLogger as logger } from "./stderr-logger";

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
    void core
      .stopAll()
      .catch((error) => {
        logger.error("シャットダウン中にエラーが発生しました", error);
      })
      .finally(() => {
        process.exit(0);
      });
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
};

// mcp-cli.cjs として直接実行された場合のエントリーポイント
// index.ts からの動的importでは呼ばれない（index.ts は独自にrunMcpProxyを呼ぶ必要がある場合のみimportする）
void runMcpProxy().catch((error: unknown) => {
  logger.error("起動に失敗しました", error);
  process.exit(1);
});
