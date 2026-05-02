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
import type {
  Logger,
  McpServerConfig,
  ServerStatus,
  ToolCallFilter,
  ToolCallHook,
  ToolPolicyResolver,
} from "./types.js";
import { createProxyCore } from "./core.js";
import { startStdioInbound } from "./inbound/stdio-inbound.js";
import {
  DEFAULT_ALLOWLIST_TOOLS,
  DEFAULT_PII_MASKING_ENABLED,
  DEFAULT_REDACTION_POLICY,
  DEFAULT_REDACTOR_OPTIONS,
} from "./security/config.js";
import { allCustomPatterns } from "./security/patterns/index.js";
import { createRedactionFilter } from "./security/redaction-filter.js";
import { stderrLogger as logger } from "./stderr-logger.js";

// PII マスキングフィルタをデフォルト設定で構築（呼び出し側で hooks.filter を渡せば上書き可能）
const buildDefaultRedactionFilter = (
  log: Logger,
): ToolCallFilter | undefined => {
  if (!DEFAULT_PII_MASKING_ENABLED) return undefined;
  return createRedactionFilter({
    policy: DEFAULT_REDACTION_POLICY,
    redactor: DEFAULT_REDACTOR_OPTIONS,
    customPatterns: allCustomPatterns,
    allowlistTools: DEFAULT_ALLOWLIST_TOOLS,
    logger: log,
  });
};

// mcp-cli.cjs バンドル経由で desktop 側から PII マスキング API を使えるように再 export
export { stderrLogger } from "./stderr-logger.js";
export { createRedactionFilter } from "./security/redaction-filter.js";
export type {
  RedactionPolicy,
  RedactionFilterOptions,
} from "./security/redaction-filter.js";
export type { PiiDetectionSummary } from "./types.js";
export {
  DEFAULT_PII_MASKING_ENABLED,
  DEFAULT_REDACTION_POLICY,
  DEFAULT_REDACTOR_OPTIONS,
  DEFAULT_ALLOWLIST_TOOLS,
} from "./security/config.js";
export {
  allCustomPatterns,
  japanPatterns,
  secretPatterns,
} from "./security/patterns/index.js";

// プロキシ起動時に注入可能なフック
export type ProxyHooks = {
  onToolCall?: ToolCallHook;
  /** シャットダウン時にprocess.exit()前に呼ばれるコールバック（DB切断等） */
  onShutdown?: () => Promise<void>;
  /** サーバーの接続状態が変化したときに呼ばれるコールバック */
  onStatusChange?: (name: string, status: ServerStatus, error?: string) => void;
  /** ツール呼び出しフィルタ（PII マスキング等の前処理・後処理） */
  filter?: ToolCallFilter;
  /**
   * ツール公開ポリシー解決関数（仮想MCP等で各ツールの公開可否・説明上書きを制御）
   * 未指定時は全ツール公開・上書きなし（既存挙動）
   */
  getToolPolicy?: ToolPolicyResolver;
};

export const runMcpProxy = async (
  configs: McpServerConfig[] = [],
  hooks?: ProxyHooks,
): Promise<void> => {
  logger.info("tumiki-mcp-proxy を起動しています...");

  const core = createProxyCore(configs, logger, hooks?.getToolPolicy);

  // ステータス変更フックを登録
  if (hooks?.onStatusChange) {
    core.onStatusChange(hooks.onStatusChange);
  }

  // PII マスキングフィルタを内蔵（呼び出し側が hooks.filter を指定すればそちらを優先）
  const enrichedHooks: ProxyHooks = {
    ...hooks,
    filter: hooks?.filter ?? buildDefaultRedactionFilter(logger),
  };

  // 全MCPサーバーに接続
  await core.startAll();

  // stdio inboundサーバーを起動（AIツールからのリクエストを受け付け）
  await startStdioInbound(core, logger, enrichedHooks);

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
        logger.error("MCPサーバーの停止中にエラーが発生しました", error);
        exitCode = 1;
      })
      .then(() => hooks?.onShutdown?.())
      .catch((error) => {
        logger.error(
          "シャットダウンフックの実行中にエラーが発生しました",
          error,
        );
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
