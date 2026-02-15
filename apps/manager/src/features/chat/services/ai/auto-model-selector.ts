/**
 * 自動モデル選択ロジック
 *
 * Cursor AIのルールベース方式を参考に、タスクの複雑さに応じて最適なAIモデルを自動選択する
 *
 * 判定要素:
 * 1. タスクタイプ（コード、質問、クリエイティブ、分析など）
 * 2. メッセージの複雑さ（長さ、構造）
 * 3. コンテキスト要件（会話履歴の長さ）
 * 4. ツール使用（MCPツールの数）
 * 5. マルチモーダル要件（添付ファイル）
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

/** タスクタイプ */
type TaskType =
  | "code" // コード関連（デバッグ、レビュー、実装）
  | "question" // 質問・情報収集
  | "creative" // クリエイティブ（文章作成、アイデア出し）
  | "analysis" // 分析・推論
  | "general"; // 一般的な会話

/** 複雑さレベルに対応するモデルID */
const MODEL_BY_COMPLEXITY: Record<TaskComplexity, string> = {
  simple: "anthropic/claude-3.5-haiku",
  standard: "anthropic/claude-3.5-sonnet",
  complex: "anthropic/claude-sonnet-4.5",
};

/** タスクタイプ検出用キーワード */
const TASK_TYPE_KEYWORDS: Record<TaskType, RegExp[]> = {
  code: [
    /コード/i,
    /実装/i,
    /デバッグ/i,
    /バグ/i,
    /エラー/i,
    /関数/i,
    /クラス/i,
    /メソッド/i,
    /レビュー/i,
    /リファクタ/i,
    /テスト/i,
    /API/i,
    /fix/i,
    /implement/i,
    /debug/i,
    /refactor/i,
    /```/, // コードブロック
  ],
  question: [
    /\?$/,
    /？$/,
    /とは/,
    /教えて/,
    /何が/,
    /どう/,
    /なぜ/,
    /いつ/,
    /どこ/,
    /誰/,
    /what/i,
    /how/i,
    /why/i,
    /when/i,
    /where/i,
    /who/i,
  ],
  creative: [
    /作成/,
    /作って/,
    /書いて/,
    /生成/,
    /アイデア/,
    /提案/,
    /考えて/,
    /create/i,
    /write/i,
    /generate/i,
    /draft/i,
  ],
  analysis: [
    /分析/,
    /比較/,
    /評価/,
    /検討/,
    /調査/,
    /レポート/,
    /まとめ/,
    /要約/,
    /analyze/i,
    /compare/i,
    /evaluate/i,
    /summarize/i,
  ],
  general: [], // デフォルト
};

/** 複雑さスコアの重み付け */
const COMPLEXITY_WEIGHTS = {
  /** タスクタイプ別の基本スコア */
  taskType: {
    code: 2, // コードタスクは複雑
    analysis: 2, // 分析タスクは複雑
    creative: 1, // クリエイティブは中程度
    question: 0, // 質問はシンプル寄り
    general: 0, // 一般会話はシンプル
  },
  /** メッセージ長によるスコア */
  messageLength: {
    short: 0, // < 50文字
    medium: 1, // 50-200文字
    long: 2, // 200-500文字
    veryLong: 3, // > 500文字
  },
  /** 会話長によるスコア */
  conversationLength: {
    short: 0, // < 3メッセージ
    medium: 1, // 3-10メッセージ
    long: 2, // > 10メッセージ
  },
  /** ツール数によるスコア */
  toolCount: {
    none: 0, // 0ツール
    few: 1, // 1-3ツール
    many: 2, // 4-7ツール
    veryMany: 3, // > 7ツール
  },
  /** 添付ファイルによるスコア（マルチモーダル） */
  attachments: 2,
} as const;

/** 複雑さ判定の閾値 */
const COMPLEXITY_THRESHOLDS = {
  /** シンプルタスクの最大スコア */
  simpleMax: 1,
  /** 標準タスクの最大スコア */
  standardMax: 4,
  // それ以上は複雑
} as const;

/**
 * メッセージからタスクタイプを検出する
 */
export const detectTaskType = (messageText: string): TaskType => {
  // 優先度順にチェック（コード > 分析 > クリエイティブ > 質問 > 一般）
  const priorityOrder: TaskType[] = [
    "code",
    "analysis",
    "creative",
    "question",
    "general",
  ];

  for (const taskType of priorityOrder) {
    const keywords = TASK_TYPE_KEYWORDS[taskType];
    if (keywords.some((regex) => regex.test(messageText))) {
      return taskType;
    }
  }

  return "general";
};

/**
 * メッセージ長のカテゴリを判定する
 */
const categorizeMessageLength = (
  length: number,
): keyof typeof COMPLEXITY_WEIGHTS.messageLength => {
  if (length < 50) return "short";
  if (length < 200) return "medium";
  if (length < 500) return "long";
  return "veryLong";
};

/**
 * 会話長のカテゴリを判定する
 */
const categorizeConversationLength = (
  length: number,
): keyof typeof COMPLEXITY_WEIGHTS.conversationLength => {
  if (length < 3) return "short";
  if (length <= 10) return "medium";
  return "long";
};

/**
 * ツール数のカテゴリを判定する
 */
const categorizeToolCount = (
  count: number,
): keyof typeof COMPLEXITY_WEIGHTS.toolCount => {
  if (count === 0) return "none";
  if (count <= 3) return "few";
  if (count <= 7) return "many";
  return "veryMany";
};

/**
 * タスクの複雑さスコアを計算する
 */
export const calculateComplexityScore = (context: TaskContext): number => {
  const { messageText, mcpToolCount, hasAttachments, conversationLength } =
    context;

  let score = 0;

  // 1. タスクタイプによるスコア
  const taskType = detectTaskType(messageText);
  score += COMPLEXITY_WEIGHTS.taskType[taskType];

  // 2. メッセージ長によるスコア
  const messageLengthCategory = categorizeMessageLength(messageText.length);
  score += COMPLEXITY_WEIGHTS.messageLength[messageLengthCategory];

  // 3. 会話長によるスコア
  const conversationCategory = categorizeConversationLength(conversationLength);
  score += COMPLEXITY_WEIGHTS.conversationLength[conversationCategory];

  // 4. ツール数によるスコア
  const toolCategory = categorizeToolCount(mcpToolCount);
  score += COMPLEXITY_WEIGHTS.toolCount[toolCategory];

  // 5. 添付ファイルによるスコア
  if (hasAttachments) {
    score += COMPLEXITY_WEIGHTS.attachments;
  }

  return score;
};

/**
 * タスクの複雑さを判定する
 *
 * Cursor AI方式: 複数の要素を組み合わせたスコアベースの判定
 */
export const analyzeTaskComplexity = (context: TaskContext): TaskComplexity => {
  const score = calculateComplexityScore(context);

  if (score <= COMPLEXITY_THRESHOLDS.simpleMax) {
    return "simple";
  }

  if (score <= COMPLEXITY_THRESHOLDS.standardMax) {
    return "standard";
  }

  return "complex";
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
