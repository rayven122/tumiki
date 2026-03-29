// MCPサーバーカタログのダミーデータ
// 将来的にはSQLiteのMcpCatalogテーブルまたはSaaS APIから取得する

export type McpCatalogItem = {
  id: string;
  name: string;
  description: string;
  tags: string[];
  iconPath: string;
  command: string;
  args: string[];
  envVarKeys: string[];
  authType: "NONE" | "API_KEY";
};

export const MCP_CATALOG_ITEMS: McpCatalogItem[] = [
  {
    id: "filesystem-stdio",
    name: "Filesystem STDIO",
    description:
      "ファイルシステム操作 - ローカルファイルの読み書き（開発・テスト用）",
    tags: ["ファイル", "ユーティリティ"],
    iconPath: "/logos/filesystem.svg",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"],
    envVarKeys: [],
    authType: "NONE",
  },
  {
    id: "github-stdio",
    name: "GitHub STDIO",
    description: "GitHub API - リポジトリ、イシュー、PR の操作",
    tags: ["開発", "Git"],
    iconPath: "/logos/github.svg",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-github"],
    envVarKeys: ["GITHUB_PERSONAL_ACCESS_TOKEN"],
    authType: "API_KEY",
  },
  {
    id: "gitlab-stdio",
    name: "GitLab STDIO",
    description: "GitLab API - プロジェクト、イシュー、MR の操作",
    tags: ["開発", "Git"],
    iconPath: "/logos/gitlab.svg",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-gitlab"],
    envVarKeys: ["GITLAB_PERSONAL_ACCESS_TOKEN", "GITLAB_API_URL"],
    authType: "API_KEY",
  },
  {
    id: "postgresql-stdio",
    name: "PostgreSQL STDIO",
    description: "PostgreSQL データベース - SQL クエリの実行とスキーマ操作",
    tags: ["データベース", "SQL"],
    iconPath: "/logos/postgresql.svg",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-postgres"],
    envVarKeys: ["POSTGRESQL_CONNECTION_STRING"],
    authType: "API_KEY",
  },
  {
    id: "slack-stdio",
    name: "Slack STDIO",
    description: "Slack API - メッセージの送受信とチャンネル操作",
    tags: ["コミュニケーション", "チャット"],
    iconPath: "/logos/slack.svg",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-slack"],
    envVarKeys: ["SLACK_BOT_TOKEN", "SLACK_TEAM_ID"],
    authType: "API_KEY",
  },
  {
    id: "sequential-thinking-stdio",
    name: "Sequential Thinking STDIO",
    description: "段階的思考サーバー - 複雑な問題解決のための段階的推論支援",
    tags: ["ユーティリティ", "AI"],
    iconPath: "/logos/thinking.svg",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-sequential-thinking"],
    envVarKeys: [],
    authType: "NONE",
  },
  {
    id: "everything-stdio",
    name: "Everything STDIO",
    description:
      "MCP テストサーバー - prompts, tools, resources, sampling などの全機能テスト用",
    tags: ["ユーティリティ", "テスト"],
    iconPath: "/logos/mcp.svg",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-everything"],
    envVarKeys: [],
    authType: "NONE",
  },
];
