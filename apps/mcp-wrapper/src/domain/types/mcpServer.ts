/**
 * MCPサーバー設定
 * McpServerTemplate から取得した実行に必要な情報
 */
export type McpServerConfig = {
  readonly id: string;
  readonly name: string;
  readonly normalizedName: string;
  readonly command: string;
  readonly args: readonly string[];
  /** HTTPヘッダー名配列（同名の環境変数として設定） */
  readonly envVarKeys: readonly string[];
};
