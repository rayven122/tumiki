#!/usr/bin/env node
/**
 * Standalone CLI: stdio MCP in front of upstream servers (no Tumiki Desktop).
 * Config from --config or TUMIKI_MCP_PROXY_CONFIG.
 */
import { readFileSync } from "node:fs";

import type { ProxyCore } from "./core.js";
import type { McpServerConfig } from "./types.js";
import { createProxyCore, createSingleServerCore } from "./core.js";
import { startStdioInbound } from "./inbound/stdio-inbound.js";
import { stderrLogger as logger } from "./stderr-logger.js";

/** テスト・上級者向け: 任意の ProxyCore で stdio MCP を起動 */
export const runMcpProxyWithCore = async (core: ProxyCore): Promise<void> => {
  logger.info("tumiki-mcp-proxy を起動しています...");

  await core.startAll();

  await startStdioInbound(core, logger);

  logger.info("tumiki-mcp-proxy の起動が完了しました");

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

export const runMcpProxy = async (
  configs: McpServerConfig[] = [],
): Promise<void> => {
  const core =
    configs.length === 1
      ? createSingleServerCore(configs[0]!, logger)
      : createProxyCore(configs, logger);
  await runMcpProxyWithCore(core);
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

/** Load MCP server list from --config or TUMIKI_MCP_PROXY_CONFIG (standalone, no Electron). */
const loadConfigsFromArgv = (): McpServerConfig[] => {
  const argv = process.argv.slice(2);
  const configIdx = argv.indexOf("--config");
  const configPath =
    configIdx !== -1
      ? argv[configIdx + 1]
      : process.env.TUMIKI_MCP_PROXY_CONFIG?.trim();

  if (!configPath) return [];

  const raw = readFileSync(configPath, "utf8");
  const parsed: unknown = JSON.parse(raw);
  const entries = Array.isArray(parsed)
    ? parsed
    : (parsed as Record<string, unknown>).servers;
  if (!Array.isArray(entries)) {
    throw new Error(`Invalid config: expected array or { "servers": [...] }`);
  }
  return entries as McpServerConfig[];
};

if (isDirectExecution) {
  const configs = loadConfigsFromArgv();
  if (configs.length === 0) {
    logger.error(
      "上流設定がありません。--config <path> または TUMIKI_MCP_PROXY_CONFIG を指定してください。",
    );
    process.exit(1);
  }
  void runMcpProxy(configs).catch((error: unknown) => {
    logger.error("起動に失敗しました", error);
    process.exit(1);
  });
}
