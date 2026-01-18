/**
 * db に登録する UnifiedMcpServer 一覧
 *
 * 複数のMcpServerTemplateを統合した仮想サーバー定義
 */

/**
 * UnifiedMcpServer 定義の型
 */
export interface UnifiedMcpServerDefinition {
  /** 統合サーバー名（表示名） */
  name: string;
  /** 統合サーバーの説明 */
  description: string;
  /** 統合対象の子サーバー名一覧（mcpServers.tsのname） */
  childServerNames: string[];
}

/**
 * 登録する UnifiedMcpServer の一覧
 */
export const UNIFIED_MCP_SERVERS: UnifiedMcpServerDefinition[] = [
  {
    name: "Calculator MCP",
    description:
      "四則演算を統合したMCPサーバー（足し算、引き算、掛け算、割り算）",
    childServerNames: ["Add MCP", "Subtract MCP", "Multiply MCP", "Divide MCP"],
  },
];
