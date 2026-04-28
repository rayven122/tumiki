/**
 * PII マスキングフィルタの検出サマリ（type 別の件数とマスク後トークン）
 * 例: { EMAIL: { count: 1, tokens: ["[EMAIL_1105]"] } }
 */
export type PiiDetectionsSummary = Record<
  string,
  { count: number; tokens: string[] }
>;

/**
 * AuditLog.piiDetections に保存される構造
 * - summary: type 別の検出集計
 * - maskedArgs: 上流 MCP に実際に渡された args 全体（生 PII は含まない）
 */
export type PiiDetectionRecord = {
  summary: PiiDetectionsSummary;
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
