/**
 * 自動モデル選択ロジック
 *
 * タスクの複雑さに応じて最適なAIモデルを自動選択する
 */

/** 自動モデル選択を示す特殊なID */
export const AUTO_MODEL_ID = "auto" as const;

/** タスクの複雑さを判定するためのコンテキスト */
export type TaskContext = {
  /** ユーザーのメッセージテキスト */
  messageText: string;
  /** 使用可能なMCPツール数 */
  mcpToolCount: number;
  /** 添付ファイルの有無 */
  hasAttachments: boolean;
  /** 会話履歴のメッセージ数 */
  conversationLength: number;
};

/** タスクの複雑さレベル */
type TaskComplexity = "simple" | "standard" | "complex";

/** 複雑さレベルに対応するモデルID */
const MODEL_BY_COMPLEXITY: Record<TaskComplexity, string> = {
  simple: "anthropic/claude-3.5-haiku",
  standard: "anthropic/claude-3.5-sonnet",
  complex: "anthropic/claude-sonnet-4.5",
};

/** 判定閾値 */
const THRESHOLDS = {
  /** シンプルタスクの最大メッセージ長 */
  simpleMaxLength: 100,
  /** シンプルタスクの最大会話数 */
  simpleMaxConversation: 3,
  /** 複雑タスクの最小メッセージ長 */
  complexMinLength: 500,
  /** 複雑タスクの最小ツール数 */
  complexMinTools: 5,
  /** 複雑タスクの最小会話数 */
  complexMinConversation: 10,
} as const;

/**
 * タスクの複雑さを判定する
 */
export const analyzeTaskComplexity = (context: TaskContext): TaskComplexity => {
  const { messageText, mcpToolCount, hasAttachments, conversationLength } =
    context;
  const messageLength = messageText.length;

  // 複雑なタスクの判定
  // - 長いメッセージ
  // - 多数のツールを使用
  // - 長い会話履歴
  // - 添付ファイルあり（画像解析など）
  if (
    messageLength > THRESHOLDS.complexMinLength ||
    mcpToolCount > THRESHOLDS.complexMinTools ||
    conversationLength > THRESHOLDS.complexMinConversation ||
    hasAttachments
  ) {
    return "complex";
  }

  // シンプルなタスクの判定
  // - 短いメッセージ
  // - ツールなし
  // - 短い会話
  if (
    messageLength < THRESHOLDS.simpleMaxLength &&
    mcpToolCount === 0 &&
    conversationLength < THRESHOLDS.simpleMaxConversation
  ) {
    return "simple";
  }

  // それ以外は標準
  return "standard";
};

/**
 * タスクのコンテキストに基づいて最適なモデルを選択する
 *
 * @param context - タスクの複雑さを判定するためのコンテキスト
 * @returns 選択されたモデルID
 */
export const selectModelByTask = (context: TaskContext): string => {
  const complexity = analyzeTaskComplexity(context);
  return MODEL_BY_COMPLEXITY[complexity];
};

/**
 * モデルIDが自動選択かどうかを判定する
 */
export const isAutoModel = (modelId: string): boolean => {
  return modelId === AUTO_MODEL_ID;
};
