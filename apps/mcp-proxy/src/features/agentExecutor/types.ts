/**
 * エージェント実行関連の型定義
 *
 * エージェントの定期実行、手動実行、Webhook実行、A2A実行のための型を定義
 */

/**
 * エージェント実行のトリガー種別
 *
 * - schedule: 定期実行（スケジュールIDを含む）
 * - webhook: Webhook経由の実行（WebhookIDとペイロードを含む）
 * - manual: 手動実行（実行ユーザーIDを含む）
 * - a2a: Agent-to-Agent実行（ソースエージェントIDとメッセージを含む）
 */
export type ExecutionTrigger =
  | { type: "schedule"; scheduleId: string }
  | { type: "webhook"; webhookId: string; payload: unknown }
  | { type: "manual"; userId: string }
  | { type: "a2a"; sourceAgentId: string; message: string };

/**
 * エージェント実行リクエスト
 */
export type ExecuteAgentRequest = {
  /** 実行するエージェントのID */
  agentId: string;
  /** 実行トリガー情報 */
  trigger: ExecutionTrigger;
  /** エージェントへの入力メッセージ（nullの場合はシステムプロンプトのみ） */
  message: string | null;
};

/**
 * エージェント実行結果
 */
export type ExecuteAgentResult = {
  /** 実行ID（ログ追跡用） */
  executionId: string;
  /** 実行成功フラグ */
  success: boolean;
  /** エージェントの出力 */
  output: string;
  /** 実行時間（ミリ秒） */
  durationMs: number;
  /** チャットID（実行詳細を保存したChat） */
  chatId?: string;
  /** エラーメッセージ（失敗時のみ） */
  error?: string;
};

/**
 * スケジュール設定
 */
export type ScheduleConfig = {
  /** スケジュールID */
  id: string;
  /** エージェントID */
  agentId: string;
  /** cron式（例: "0 9 * * *" = 毎日9時） */
  cronExpression: string;
  /** タイムゾーン（例: "Asia/Tokyo"） */
  timezone: string;
  /** 有効フラグ */
  isEnabled: boolean;
  /** 実行時のメッセージ（オプション） */
  message?: string;
};

/**
 * スケジュール同期アクション
 */
export type ScheduleSyncAction = "register" | "unregister" | "sync_all";

/**
 * スケジュール同期リクエスト
 */
export type ScheduleSyncRequest = {
  /** 同期アクション */
  action: ScheduleSyncAction;
  /** 対象スケジュール設定（register時に必須） */
  schedule?: ScheduleConfig;
  /** 対象スケジュールID（unregister時に必須） */
  scheduleId?: string;
  /** 全スケジュール設定（sync_all時に必須） */
  schedules?: ScheduleConfig[];
};

/**
 * 手動実行リクエスト
 */
export type ManualRunRequest = {
  /** スケジュールID */
  scheduleId: string;
  /** 実行ユーザーID */
  userId: string;
};
