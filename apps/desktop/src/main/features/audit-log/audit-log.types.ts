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
