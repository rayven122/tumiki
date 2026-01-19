/**
 * Dynamic Search 機能の型定義
 */

/**
 * search_tools の引数
 */
export type SearchToolsArgs = {
  /** 検索クエリ（自然言語でツールを検索） */
  query: string;
  /** 返す結果の最大数（デフォルト: 10） */
  limit?: number;
};

/**
 * describe_tools の引数
 */
export type DescribeToolsArgs = {
  /** スキーマを取得するツール名の配列 */
  toolNames: string[];
};

/**
 * execute_tool の引数
 */
export type ExecuteToolArgs = {
  /** 実行するツール名 */
  toolName: string;
  /** ツールに渡す引数 */
  arguments: Record<string, unknown>;
};

/**
 * ツール情報（内部用）
 */
export type ToolInfo = {
  /** ツール名（"{インスタンス名}__{ツール名}" 形式） */
  name: string;
  /** ツールの説明 */
  description: string | null;
  /** ツールの入力スキーマ（JSON Schema形式） */
  inputSchema: Record<string, unknown>;
};

/**
 * 検索結果
 */
export type SearchResult = {
  /** ツール名 */
  toolName: string;
  /** ツールの説明 */
  description: string | null;
  /** 関連度スコア（0-1） */
  relevanceScore: number;
};
