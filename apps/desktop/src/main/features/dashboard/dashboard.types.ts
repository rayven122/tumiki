/**
 * ダッシュボード集計用の型（IPC通信用）
 */

/** 集計対象の期間 */
export type DashboardPeriod = "24h" | "7d" | "30d";

/** KPIカードの値（前期比含む） */
export type DashboardKpi = {
  /** 期間内のリクエスト総数 */
  requests: number;
  /** 前期間との差分（件数）。プラスなら増加 */
  requestsDelta: number;
  /** 期間内の失敗（ブロック）件数 */
  blocks: number;
  /** 失敗率（0-100、小数1位まで） */
  blockRate: number;
  /** 期間内の成功率（0-100、小数1位まで） */
  successRate: number;
  /** 前期間との差分（パーセントポイント、小数1位まで） */
  successRateDelta: number;
  /** 登録済みコネクタ（接続）数 */
  connectors: number;
  /** RUNNING でないサーバー数 */
  connectorsDegraded: number;
};

/** 時系列チャートの1点 */
export type DashboardTimePoint = {
  /** X軸ラベル */
  label: string;
  /** seriesキーごとの集計値 */
  values: Record<string, number>;
};

/** 時系列チャートの系列定義（凡例も兼ねる） */
export type DashboardConnectorSeries = {
  /** チャートの dataKey として使う安全な識別子 */
  key: string;
  /** 凡例ラベル（接続表示名） */
  label: string;
  /** 線・塗りの色（HEX） */
  color: string;
};

/** AIクライアント別の構成比 */
export type DashboardAiClient = {
  /** クライアント名（AuditLog.clientName そのまま） */
  name: string;
  /** 件数 */
  count: number;
  /** 構成比（0-100、小数1位まで） */
  percentage: number;
};

/** コネクタカード表示用のステータス */
export type DashboardConnectorStatus = "active" | "degraded" | "inactive";

/** コネクタカード（接続単位） */
export type DashboardConnectorCard = {
  serverId: number;
  connectionId: number;
  name: string;
  /** カタログから登録した場合のアイコンパス */
  iconPath: string | null;
  status: DashboardConnectorStatus;
};

/** 直近のログ表示用 */
export type DashboardLogItem = {
  id: number;
  /** ISO 8601 文字列 */
  createdAt: string;
  connectionName: string | null;
  toolName: string;
  clientName: string | null;
  isSuccess: boolean;
  durationMs: number;
};

/** ダッシュボード取得の入力（renderer → main） */
export type DashboardInput = {
  period: DashboardPeriod;
};

/** ダッシュボード取得の結果（main → renderer） */
export type DashboardResult = {
  period: DashboardPeriod;
  kpi: DashboardKpi;
  series: DashboardConnectorSeries[];
  timeline: DashboardTimePoint[];
  aiClients: DashboardAiClient[];
  connectors: DashboardConnectorCard[];
  recentLogs: DashboardLogItem[];
};
