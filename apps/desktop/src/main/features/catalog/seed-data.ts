import type { CatalogSeedData } from "./catalog.repository";

/**
 * Desktop用MCPカタログのシードデータ
 * DEV-1461: 全トランスポート対応MCPの調査・登録
 */
export const CATALOG_SEEDS: readonly CatalogSeedData[] = [
  // ========================================
  // stdio MCP（ローカルプロセス）
  // ========================================
  {
    name: "Filesystem STDIO",
    description:
      "ファイルシステム操作 - ローカルファイルの読み書き（開発・テスト用）",
    iconPath: "/logos/services/database.svg",
    transportType: "STDIO",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"],
    credentialKeys: [],
    authType: "NONE",
    isOfficial: true,
  },
  {
    name: "Sequential Thinking STDIO",
    description: "段階的思考サーバー - 複雑な問題解決のための段階的推論支援",
    iconPath: "/logos/services/database.svg",
    transportType: "STDIO",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-sequential-thinking"],
    credentialKeys: [],
    authType: "NONE",
    isOfficial: true,
  },
  {
    name: "DeepL STDIO",
    description: "DeepL 翻訳サービス - 高精度なAI翻訳",
    iconPath: "/logos/services/database.svg",
    transportType: "STDIO",
    command: "npx",
    args: ["-y", "deepl-mcp-server"],
    credentialKeys: ["DEEPL_API_KEY"],
    authType: "API_KEY",
    isOfficial: true,
  },
  {
    name: "Brave Search STDIO",
    description: "Brave Search API - プライバシー重視の検索エンジン",
    iconPath: "/logos/services/database.svg",
    transportType: "STDIO",
    command: "npx",
    args: ["-y", "@brave/brave-search-mcp-server"],
    credentialKeys: ["BRAVE_API_KEY"],
    authType: "API_KEY",
    isOfficial: true,
  },
  {
    name: "Chatwork STDIO",
    description: "Chatwork API - メッセージの送受信とルーム操作",
    iconPath: "/logos/services/database.svg",
    transportType: "STDIO",
    command: "npx",
    args: ["-y", "@chatwork/mcp-server"],
    credentialKeys: ["CHATWORK_API_TOKEN"],
    authType: "API_KEY",
    isOfficial: true,
  },

  // ========================================
  // Streamable HTTP MCP（リモート・認証なし）
  // ========================================
  {
    name: "Context7",
    description:
      "ライブラリドキュメント検索サービス - 最新のドキュメントをリアルタイムで取得",
    iconPath: "/logos/services/database.svg",
    transportType: "STREAMABLE_HTTP",
    url: "https://mcp.context7.com/mcp",
    credentialKeys: [],
    authType: "NONE",
    isOfficial: true,
  },

  // ========================================
  // Streamable HTTP MCP（リモート・OAuth）
  // ========================================
  {
    name: "Figma MCP",
    description:
      "Figma 公式MCPサーバー - デザインファイルの読み取りとコード生成",
    iconPath: "/logos/services/database.svg",
    transportType: "STREAMABLE_HTTP",
    url: "https://mcp.figma.com/mcp",
    credentialKeys: [],
    authType: "OAUTH",
    isOfficial: true,
  },
  {
    name: "Linear MCP",
    description:
      "Linear プロジェクト管理サービス - イシュー、プロジェクト、チーム情報へのアクセス",
    iconPath: "/logos/services/database.svg",
    transportType: "STREAMABLE_HTTP",
    url: "https://mcp.linear.app/mcp",
    credentialKeys: [],
    authType: "OAUTH",
    isOfficial: true,
  },
  {
    name: "Notion MCP",
    description:
      "Notion ワークスペース統合 - ページ、データベース、コメントへのライブアクセス",
    iconPath: "/logos/services/database.svg",
    transportType: "STREAMABLE_HTTP",
    url: "https://mcp.notion.com/mcp",
    credentialKeys: [],
    authType: "OAUTH",
    isOfficial: true,
  },
  {
    name: "GitHub MCP",
    description:
      "GitHub 公式MCPサーバー - リポジトリ、イシュー、PR、ワークフローの管理",
    iconPath: "/logos/services/database.svg",
    transportType: "STREAMABLE_HTTP",
    url: "https://api.githubcopilot.com/mcp",
    credentialKeys: [],
    authType: "OAUTH",
    isOfficial: true,
  },
  {
    name: "GitLab MCP",
    description:
      "GitLab 公式MCPサーバー - プロジェクト、イシュー、MRの操作",
    iconPath: "/logos/services/database.svg",
    transportType: "STREAMABLE_HTTP",
    url: "https://gitlab.com/api/v4/mcp",
    credentialKeys: [],
    authType: "OAUTH",
    isOfficial: true,
  },
  {
    name: "Slack MCP",
    description: "Slack 公式MCPサーバー - メッセージ、チャンネル、ワークスペースの操作",
    iconPath: "/logos/services/database.svg",
    transportType: "STREAMABLE_HTTP",
    url: "https://tools.slack.dev/mcp",
    credentialKeys: [],
    authType: "OAUTH",
    isOfficial: true,
  },
  {
    name: "Google Maps MCP",
    description:
      "Google Maps API - 地図情報、経路検索、場所の詳細情報へのアクセス",
    iconPath: "/logos/services/database.svg",
    transportType: "STREAMABLE_HTTP",
    url: "https://mcp.googleapis.com/v1alpha/maps:streamableHttp",
    credentialKeys: [],
    authType: "OAUTH",
    isOfficial: true,
  },
  {
    name: "Atlassian MCP",
    description:
      "Atlassian 公式MCPサーバー - Jira、Confluenceとの統合アクセス",
    iconPath: "/logos/services/database.svg",
    transportType: "STREAMABLE_HTTP",
    url: "https://mcp.atlassian.com/v1/mcp",
    credentialKeys: [],
    authType: "OAUTH",
    isOfficial: true,
  },
  {
    name: "Asana MCP",
    description:
      "Asana プロジェクト管理 - タスク、プロジェクト、ワークスペースの操作",
    iconPath: "/logos/services/database.svg",
    transportType: "STREAMABLE_HTTP",
    url: "https://mcp.asana.com/v2/mcp",
    credentialKeys: [],
    authType: "OAUTH",
    isOfficial: true,
  },
  {
    name: "Money Forward MCP",
    description: "マネーフォワード クラウド - 会計・経理業務の統合アクセス",
    iconPath: "/logos/services/database.svg",
    transportType: "STREAMABLE_HTTP",
    url: "https://mcp.moneyforward.com/mcp",
    credentialKeys: [],
    authType: "OAUTH",
    isOfficial: true,
  },
  {
    name: "Freee MCP",
    description: "freee 会計・人事労務 - 会計データへのアクセスと操作",
    iconPath: "/logos/services/database.svg",
    transportType: "STREAMABLE_HTTP",
    url: "https://mcp.freee.co.jp/mcp",
    credentialKeys: [],
    authType: "OAUTH",
    isOfficial: true,
  },
];
