#!/usr/bin/env node
/**
 * --mcp-proxy CLIエントリーポイント
 * claude code → tumiki --mcp-proxy --server serena → Serena MCP の接続フロー
 *
 * 各MCPサーバーごとに個別のプロキシプロセスとして起動する。
 * AIツール側では、MCPサーバーごとに別々のエントリを設定する:
 *   { "command": "tumiki", "args": ["--mcp-proxy", "--server", "serena"] }
 */
import {
  createProxyCore,
  createSingleServerCore,
  resolveServerConfigs,
} from "./core.js";
import { startStdioInbound } from "./inbound/stdio-inbound.js";
import { stderrLogger as logger } from "./stderr-logger.js";

/**
 * process.argvから --server <name> を取得する
 */
const parseServerName = (): string => {
  const idx = process.argv.indexOf("--server");
  if (idx === -1 || idx + 1 >= process.argv.length) {
    throw new Error(`--server <name> の指定が必要です`);
  }
  return process.argv[idx + 1]!;
};

export const runMcpProxy = async (): Promise<void> => {
  const serverName = parseServerName();
  const configs = resolveServerConfigs(serverName);

  logger.info(`tumiki-mcp-proxy を起動しています（server: ${serverName}）...`);

  // 単体サーバー: prefixなしで直接委譲、複数: ToolAggregator経由で集約
  const core =
    configs.length === 1
      ? createSingleServerCore(configs[0]!, logger)
      : createProxyCore(configs, logger);

  // 指定MCPサーバーに接続
  await core.startAll();

  // stdio inboundサーバーを起動（AIツールからのリクエストを受け付け）
  await startStdioInbound(core, logger);

  logger.info(`tumiki-mcp-proxy の起動が完了しました（server: ${serverName}）`);

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
