/**
 * Electron非依存の MCP Proxy CLIエントリーポイント
 *
 * Claude Code / Claude Desktop から stdio で接続する:
 *   node mcp-proxy-cli.cjs --server <slug>
 *
 * --server 指定時は該当サーバーの接続のみ起動。
 * 未指定時は全有効接続を一括起動（prefix付き）。
 */
import {
  createSingleServerCore,
  createProxyCore,
  startStdioInbound,
  stderrLogger as logger,
} from "@tumiki/mcp-proxy-core";
import { getEnabledConfigs, getAvailableServerSlugs } from "./config-loader";
import { getDb, closeDb } from "./db";
import { runMigrations } from "./migration-runner";

const parseServerSlug = (): string | undefined => {
  const idx = process.argv.indexOf("--server");
  if (idx === -1) return undefined;
  if (idx + 1 >= process.argv.length) {
    throw new Error("--server <slug> の指定が必要です");
  }
  return process.argv[idx + 1]!;
};

const main = async (): Promise<void> => {
  const serverSlug = parseServerSlug();

  logger.info(
    `tumiki-mcp-proxy を起動しています...${serverSlug ? ` (server: ${serverSlug})` : ""}`,
  );

  // DB初期化（マイグレーション適用）
  const db = getDb();
  await runMigrations(db);

  const configs = await getEnabledConfigs(serverSlug);

  if (configs.length === 0) {
    const available = await getAvailableServerSlugs();
    const availableMsg =
      available.length > 0
        ? `利用可能なサーバー: ${available.join(", ")}`
        : "有効なサーバーがありません";
    throw new Error(
      serverSlug
        ? `サーバー "${serverSlug}" の有効な接続が見つかりません（${availableMsg}）`
        : `有効な接続が見つかりません（${availableMsg}）`,
    );
  }

  // 単体: prefixなしで直接委譲、複数: ToolAggregator経由でprefix付き集約
  const core =
    configs.length === 1
      ? createSingleServerCore(configs[0]!, logger)
      : createProxyCore(configs, logger);

  await core.startAll();
  await startStdioInbound(core, logger);

  logger.info("tumiki-mcp-proxy の起動が完了しました");

  // クリーンシャットダウン（二重実行防止）
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
      .then(() => closeDb())
      .finally(() => {
        process.exit(exitCode);
      });
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
};

main().catch((error: unknown) => {
  const msg = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  process.stderr.write(`[tumiki-mcp-proxy] 起動に失敗しました: ${msg}\n`);
  if (stack) {
    process.stderr.write(`${stack}\n`);
  }
  void closeDb().finally(() => {
    process.exit(1);
  });
});
