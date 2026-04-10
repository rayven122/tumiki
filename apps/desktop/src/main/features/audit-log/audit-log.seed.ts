import { getDb } from "../../shared/db";
import * as logger from "../../shared/utils/logger";

/** シード用監査ログデータ */
type AuditLogSeedEntry = {
  toolName: string;
  method: string;
  transportType: "STDIO" | "SSE" | "STREAMABLE_HTTP";
  durationMs: number;
  inputBytes: number;
  outputBytes: number;
  isSuccess: boolean;
  errorCode: number | null;
  errorSummary: string | null;
  detail: string | null;
  connectionName: string | null;
  /** 現在時刻からの相対オフセット（分） */
  minutesAgo: number;
};

/** Figma MCP用ダミー監査ログ */
const FIGMA_AUDIT_LOG_SEEDS: readonly AuditLogSeedEntry[] = [
  {
    toolName: "get_file",
    method: "tools/call",
    transportType: "STREAMABLE_HTTP",
    durationMs: 320,
    inputBytes: 128,
    outputBytes: 4096,
    isSuccess: true,
    errorCode: null,
    errorSummary: null,
    detail: "LP redesign ファイル取得",
    connectionName: "Figma MCP",
    minutesAgo: 5,
  },
  {
    toolName: "get_styles",
    method: "tools/call",
    transportType: "STREAMABLE_HTTP",
    durationMs: 185,
    inputBytes: 96,
    outputBytes: 2048,
    isSuccess: true,
    errorCode: null,
    errorSummary: null,
    detail: "カラーパレット取得",
    connectionName: "Figma MCP",
    minutesAgo: 12,
  },
  {
    toolName: "get_components",
    method: "tools/call",
    transportType: "STREAMABLE_HTTP",
    durationMs: 245,
    inputBytes: 112,
    outputBytes: 3200,
    isSuccess: true,
    errorCode: null,
    errorSummary: null,
    detail: "Buttonコンポーネント一覧",
    connectionName: "Figma MCP",
    minutesAgo: 18,
  },
  {
    toolName: "get_node",
    method: "tools/call",
    transportType: "STREAMABLE_HTTP",
    durationMs: 410,
    inputBytes: 144,
    outputBytes: 8192,
    isSuccess: true,
    errorCode: null,
    errorSummary: null,
    detail: "Hero Section ノード詳細",
    connectionName: "Figma MCP",
    minutesAgo: 25,
  },
  {
    toolName: "get_images",
    method: "tools/call",
    transportType: "STREAMABLE_HTTP",
    durationMs: 1200,
    inputBytes: 160,
    outputBytes: 16384,
    isSuccess: true,
    errorCode: null,
    errorSummary: null,
    detail: "アイコンSVGエクスポート",
    connectionName: "Figma MCP",
    minutesAgo: 30,
  },
  {
    toolName: "get_file",
    method: "tools/call",
    transportType: "STREAMABLE_HTTP",
    durationMs: 15,
    inputBytes: 128,
    outputBytes: 0,
    isSuccess: false,
    errorCode: -32600,
    errorSummary: "File not found",
    detail: "削除済みファイル参照",
    connectionName: "Figma MCP",
    minutesAgo: 45,
  },
  {
    toolName: "get_comments",
    method: "tools/call",
    transportType: "STREAMABLE_HTTP",
    durationMs: 95,
    inputBytes: 104,
    outputBytes: 1024,
    isSuccess: true,
    errorCode: null,
    errorSummary: null,
    detail: "デザインレビューコメント取得",
    connectionName: "Figma MCP",
    minutesAgo: 60,
  },
  {
    toolName: "get_file_versions",
    method: "tools/call",
    transportType: "STREAMABLE_HTTP",
    durationMs: 150,
    inputBytes: 96,
    outputBytes: 1536,
    isSuccess: true,
    errorCode: null,
    errorSummary: null,
    detail: "バージョン履歴取得",
    connectionName: "Figma MCP",
    minutesAgo: 90,
  },
  {
    toolName: "get_components",
    method: "tools/call",
    transportType: "STREAMABLE_HTTP",
    durationMs: 280,
    inputBytes: 112,
    outputBytes: 4800,
    isSuccess: true,
    errorCode: null,
    errorSummary: null,
    detail: "Cardコンポーネント一覧",
    connectionName: "Figma MCP",
    minutesAgo: 120,
  },
  {
    toolName: "get_node",
    method: "tools/call",
    transportType: "STREAMABLE_HTTP",
    durationMs: 18,
    inputBytes: 144,
    outputBytes: 0,
    isSuccess: false,
    errorCode: -32603,
    errorSummary: "Rate limit exceeded",
    detail: "レート制限超過",
    connectionName: "Figma MCP",
    minutesAgo: 150,
  },
];

/**
 * Figma MCPサーバーに監査ログのシードデータを投入（冪等）
 * 既にレコードが存在するサーバーにはスキップ
 */
export const seedAuditLogs = async (): Promise<void> => {
  const db = await getDb();

  // "Figma MCP" を名前に含むサーバーを検索
  const figmaServer = await db.mcpServer.findFirst({
    where: { name: { contains: "Figma" } },
  });

  if (!figmaServer) {
    logger.info("Figma MCP server not found, skipping audit log seed");
    return;
  }

  // 既存レコードがあればスキップ（冪等性）
  const existingCount = await db.auditLog.count({
    where: { serverId: figmaServer.id },
  });
  if (existingCount > 0) {
    return;
  }

  const now = Date.now();
  const records = FIGMA_AUDIT_LOG_SEEDS.map((seed) => ({
    toolName: seed.toolName,
    method: seed.method,
    transportType: seed.transportType,
    durationMs: seed.durationMs,
    inputBytes: seed.inputBytes,
    outputBytes: seed.outputBytes,
    isSuccess: seed.isSuccess,
    errorCode: seed.errorCode,
    errorSummary: seed.errorSummary,
    detail: seed.detail,
    connectionName: seed.connectionName,
    serverId: figmaServer.id,
    createdAt: new Date(now - seed.minutesAgo * 60 * 1000),
  }));

  await db.auditLog.createMany({ data: records });

  logger.info(
    `Seeded ${records.length} audit log entries for "${figmaServer.name}"`,
  );
};
