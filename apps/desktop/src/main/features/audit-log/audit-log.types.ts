// PII マスキングフィルタの検出サマリ（mcp-proxy-core と同名で統一）
import type { PiiDetectionSummary } from "@tumiki/mcp-proxy-core";

export type { PiiDetectionSummary };

// AuditLog.piiDetections の保存構造（summary: type 別件数とトークン、maskedArgs: 上流に渡した args）
export type PiiDetectionRecord = {
  summary: PiiDetectionSummary;
  maskedArgs: Record<string, unknown> | null;
};

/**
 * 監査ログ情報型（IPC通信用）
 * Prisma AuditLog を起点に、Date→stringへ変換
 */
export type AuditLogItem = {
  id: number;
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
  createdAt: string;
  serverId: number;
  connectionName: string | null;
  clientName: string | null;
  clientVersion: string | null;
  /** PII マスキングフィルタの検出記録（フィルタ無効 or 検出なしなら null） */
  piiDetections: PiiDetectionRecord | null;
  /** 適用したマスキングポリシー（mask / detect-only / block） */
  piiPolicy: string | null;
};

/**
 * 監査ログ一覧取得の入力型（renderer → main）
 */
export type AuditLogListInput = {
  serverId: number;
  page?: number;
  perPage?: number;
  statusFilter?: "all" | "success" | "error";
  dateFrom?: string;
  dateTo?: string;
};

/**
 * 全サーバー横断の監査ログ一覧取得の入力型（renderer → main）
 */
export type AuditLogListAllInput = {
  page?: number;
  perPage?: number;
  statusFilter?: "all" | "success" | "error";
  dateFrom?: string;
  dateTo?: string;
};

/**
 * 監査ログ一覧取得の結果型（main → renderer）
 */
export type AuditLogListResult = {
  items: AuditLogItem[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  /** フィルタ無関係の全体件数 */
  overallCount: number;
  /** 全件ベースの成功率（0〜100） */
  successRate: number;
  /** 全件ベースの平均応答時間（ミリ秒） */
  avgDurationMs: number;
};
