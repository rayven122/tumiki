import type { AuthType, McpServerVisibility, TransportType } from "@tumiki/db";

/**
 * STDIO MCP サーバーテンプレート一覧
 *
 * mcp-wrapper で動的に起動される環境変数ベースの MCP サーバー
 * OAuth/ファイルベースの MCP サーバーは対象外（Cloud Run で対応）
 *
 * npm パッケージ参照:
 * - @modelcontextprotocol/* - https://www.npmjs.com/search?q=@modelcontextprotocol
 */

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type StdioMcpServer = {
  name: string;
  description: string;
  tags: string[];
  iconPath: string;
  transportType: TransportType;
  command: string;
  args: string[];
  envVarKeys: string[];
  authType: AuthType;
  visibility: McpServerVisibility;
};

export const STDIO_MCP_SERVERS: StdioMcpServer[] = [
  // ========================================
  // ユーティリティ系（npm パッケージ確認済み）
  // ========================================
  // Note: Memory STDIO は除外（ファイル永続化が必要なため、環境変数ベースのスコープ外）
  {
    name: "Everything STDIO",
    description:
      "MCP テストサーバー - prompts, tools, resources, sampling などの全機能テスト用",
    tags: ["ユーティリティ", "テスト", "ツール"],
    iconPath: "/logos/mcp.svg",
    transportType: "STDIO" as const,
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-everything"],
    envVarKeys: [],
    authType: "NONE" as const,
    visibility: "PUBLIC" as const,
  },
  {
    name: "Sequential Thinking STDIO",
    description: "段階的思考サーバー - 複雑な問題解決のための段階的推論支援",
    tags: ["ユーティリティ", "AI", "ツール"],
    iconPath: "/logos/thinking.svg",
    transportType: "STDIO" as const,
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-sequential-thinking"],
    envVarKeys: [],
    authType: "NONE" as const,
    visibility: "PUBLIC" as const,
  },

  // ========================================
  // ファイルシステム系（ローカル開発用）
  // Note: 本番環境ではセキュリティ上の理由で制限が必要
  // ========================================
  {
    name: "Filesystem STDIO",
    description:
      "ファイルシステム操作 - ローカルファイルの読み書き（開発・テスト用）",
    tags: ["ファイル", "ユーティリティ", "ツール"],
    iconPath: "/logos/filesystem.svg",
    transportType: "STDIO" as const,
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"],
    envVarKeys: [],
    authType: "NONE" as const,
    visibility: "PUBLIC" as const,
  },

  // ========================================
  // 開発ツール系
  // ========================================
  {
    name: "GitHub STDIO",
    description: "GitHub API - リポジトリ、イシュー、PR の操作",
    tags: ["開発", "Git", "ツール"],
    iconPath: "/logos/github.svg",
    transportType: "STDIO" as const,
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-github"],
    envVarKeys: ["X-GitHub-Personal-Access-Token"],
    authType: "API_KEY" as const,
    visibility: "PUBLIC" as const,
  },
  {
    name: "GitLab STDIO",
    description: "GitLab API - プロジェクト、イシュー、MR の操作",
    tags: ["開発", "Git", "ツール"],
    iconPath: "/logos/gitlab.svg",
    transportType: "STDIO" as const,
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-gitlab"],
    envVarKeys: ["X-GitLab-Personal-Access-Token", "X-GitLab-API-URL"],
    authType: "API_KEY" as const,
    visibility: "PUBLIC" as const,
  },

  // ========================================
  // データベース系
  // ========================================
  {
    name: "PostgreSQL STDIO",
    description: "PostgreSQL データベース - SQL クエリの実行とスキーマ操作",
    tags: ["データベース", "SQL", "ツール"],
    iconPath: "/logos/postgresql.svg",
    transportType: "STDIO" as const,
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-postgres"],
    envVarKeys: ["X-PostgreSQL-Connection-String"],
    authType: "API_KEY" as const,
    visibility: "PUBLIC" as const,
  },
  // Note: SQLite STDIO は除外（npm パッケージが存在しない）

  // ========================================
  // コミュニケーション系
  // ========================================
  {
    name: "Slack STDIO",
    description: "Slack API - メッセージの送受信とチャンネル操作",
    tags: ["コミュニケーション", "チャット", "ツール"],
    iconPath: "/logos/slack.svg",
    transportType: "STDIO" as const,
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-slack"],
    envVarKeys: ["X-Slack-Bot-Token", "X-Slack-Team-ID"],
    authType: "API_KEY" as const,
    visibility: "PUBLIC" as const,
  },
];
