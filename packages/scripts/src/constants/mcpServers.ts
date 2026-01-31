import type { McpServerVisibility, TransportType } from "@prisma/client";

/**
 * db に登録する MCP サーバーテンプレート一覧
 *
 * リモートMCPサーバー専用 (STREAMABLE_HTTPS / SSE トランスポート)
 * STDIO タイプは廃止されました
 */

export type McpServer = {
  name: string;
  description: string;
  tags: string[];
  iconPath: string;
  url: string;
  transportType: TransportType;
  visibility: McpServerVisibility;
} & (
  | {
      authType: "NONE";
    }
  | {
      authType: "OAUTH";
      oauthProvider: string;
    }
  | {
      authType: "API_KEY";
      envVarKeys: string[];
      useCloudRunIam?: boolean;
    }
);
export const MCP_SERVERS: McpServer[] = [
  // ========================================
  // Public Remote MCP Servers (認証なし)
  // ========================================
  {
    name: "Context7",
    description:
      "ライブラリドキュメント検索サービス - 最新のドキュメントをリアルタイムで取得",
    tags: ["ドキュメント", "検索", "ツール"],
    iconPath: "/logos/context7.svg",
    url: "https://mcp.context7.com/mcp",
    transportType: "STREAMABLE_HTTPS" as const,
    authType: "NONE" as const,
    visibility: "PUBLIC" as const,
  },
  // ========================================
  // OAuth Remote MCP Servers (DCR対応)
  // ========================================
  {
    name: "Figma MCP",
    description:
      "Figma 公式MCPサーバー - デザインファイルの読み取りとコード生成",
    tags: ["デザイン", "UI/UX", "ツール"],
    iconPath: "/logos/figma.svg",
    url: "https://mcp.figma.com/mcp",
    transportType: "STREAMABLE_HTTPS" as const,
    authType: "OAUTH" as const,
    visibility: "PUBLIC" as const,
    oauthProvider: "figma",
  },
  {
    name: "Linear MCP",
    description:
      "Linear プロジェクト管理サービス - イシュー、プロジェクト、チーム情報へのアクセス",
    tags: ["プロジェクト管理", "イシュー管理", "ツール"],
    iconPath: "/logos/linear.svg",
    url: "https://mcp.linear.app/mcp",
    transportType: "STREAMABLE_HTTPS" as const,
    authType: "OAUTH" as const,
    visibility: "PUBLIC" as const,
    oauthProvider: "linear",
  },
  {
    name: "Notion MCP",
    description:
      "Notion ワークスペース統合 - ページ、データベース、コメントへのライブアクセス",
    tags: ["ドキュメント", "ナレッジベース", "ツール"],
    iconPath: "/logos/notion.svg",
    url: "https://mcp.notion.com/mcp",
    transportType: "STREAMABLE_HTTPS" as const,
    authType: "OAUTH" as const,
    visibility: "PUBLIC" as const,
    oauthProvider: "notion",
  },
  // {
  //   name: "GitHub MCP",
  //   description:
  //     "GitHub 公式MCPサーバー - リポジトリ、イシュー、PR、ワークフローの管理",
  //   tags: ["開発", "バージョン管理", "CI/CD", "ツール"],
  //   iconPath: "/logos/github.svg",
  //   url: "https://api.githubcopilot.com/mcp",
  //   transportType: "STREAMABLE_HTTPS" as const,
  //   authType: "OAUTH" as const,
  //   oauthProvider: "github",
  //   visibility: "PUBLIC" as const,
  // },
  {
    name: "Atlassian MCP",
    description: "Atlassian 公式MCPサーバー - Jira、Confluenceとの統合アクセス",
    tags: ["プロジェクト管理", "ドキュメント", "コラボレーション", "ツール"],
    iconPath: "/logos/atlassian.svg",
    url: "https://mcp.atlassian.com/v1/sse",
    transportType: "SSE" as const,
    authType: "OAUTH" as const,
    visibility: "PUBLIC" as const,
    oauthProvider: "atlassian",
  },
  // ========================================
  // Cloud Run Remote MCP Servers
  // ========================================
  // Cloud Run にデプロイされた MCP サーバー
  // URL は実際のデプロイ先に置き換える必要があります
  {
    name: "DeepL MCP",
    description: "DeepL 翻訳サービス",
    tags: ["翻訳", "ツール"],
    iconPath: "/logos/deepl.svg",
    url: "https://deepl-mcp-67726874216.asia-northeast1.run.app/mcp",
    transportType: "STREAMABLE_HTTPS" as const,
    // Cloud Run認証はgoogle-auth-libraryで自動取得（useCloudRunIam）
    // envVarKeysはMCPサーバー用のカスタムヘッダーのみ
    envVarKeys: ["X-DeepL-API-Key"],
    authType: "API_KEY" as const,
    useCloudRunIam: true,
    visibility: "PUBLIC" as const,
  },
  {
    name: "Brave Search MCP",
    description: "Brave Search API統合 - 検索エンジンAPI",
    tags: ["検索", "ツール"],
    iconPath: "/logos/brave-search.png",
    url: "https://brave-search-mcp-67726874216.asia-northeast1.run.app/mcp",
    transportType: "STREAMABLE_HTTPS" as const,
    envVarKeys: ["X-Brave-API-Key"],
    authType: "API_KEY" as const,
    useCloudRunIam: true,
    visibility: "PUBLIC" as const,
  },
  {
    name: "Clarity MCP",
    description: "Microsoft Clarity分析とヒートマップ統合",
    tags: ["分析", "ツール"],
    iconPath: "/logos/microsoft-clarity.png",
    url: "https://clarity-mcp-67726874216.asia-northeast1.run.app/mcp",
    transportType: "STREAMABLE_HTTPS" as const,
    envVarKeys: ["X-Clarity-API-Token"],
    authType: "API_KEY" as const,
    useCloudRunIam: true,
    visibility: "PUBLIC" as const,
  },
  // {
  //   name: "Discord MCP",
  //   description: "Discord統合 - AIアシスタント向けMCPサーバー",
  //   tags: ["チャット", "コミュニケーション", "ツール"],
  //   iconPath: "/logos/discord.svg",
  //   url: "https://discord-mcp-67726874216.asia-northeast1.run.app/mcp",
  //   transportType: "STREAMABLE_HTTPS" as const,
  //   envVarKeys: ["X-Discord-Token"],
  //   authType: "API_KEY" as const,
  //   useCloudRunIam: true,
  //   visibility: "PUBLIC" as const,
  // },
  {
    name: "Gemini MCP",
    description: "Gemini Google Search統合",
    tags: ["検索", "AI", "ツール"],
    iconPath: "/logos/gemini-search.png",
    url: "https://gemini-mcp-67726874216.asia-northeast1.run.app/mcp",
    transportType: "STREAMABLE_HTTPS" as const,
    envVarKeys: ["X-Gemini-API-Key", "X-Gemini-Model"],
    authType: "API_KEY" as const,
    useCloudRunIam: true,
    visibility: "PUBLIC" as const,
  },
  {
    name: "Kubernetes MCP",
    description: "Kubernetes API とリソース管理",
    tags: ["インフラ", "DevOps", "ツール"],
    iconPath: "/logos/kubernetes.svg",
    url: "https://kubernetes-mcp-67726874216.asia-northeast1.run.app/mcp",
    transportType: "STREAMABLE_HTTPS" as const,
    envVarKeys: ["X-Allow-Only-Non-Destructive-Tools"],
    authType: "API_KEY" as const,
    useCloudRunIam: true,
    visibility: "PUBLIC" as const,
  },
  {
    name: "LINE Bot MCP",
    description: "LINE Bot MCP統合",
    tags: ["チャット", "コミュニケーション", "ツール"],
    iconPath: "/logos/line.svg",
    url: "https://line-bot-mcp-67726874216.asia-northeast1.run.app/mcp",
    transportType: "STREAMABLE_HTTPS" as const,
    envVarKeys: ["X-Channel-Access-Token", "X-Destination-User-ID"],
    authType: "API_KEY" as const,
    useCloudRunIam: true,
    visibility: "PUBLIC" as const,
  },
  {
    name: "microCMS MCP",
    description: "microCMS API統合",
    tags: ["CMS", "ヘッドレスCMS", "ツール"],
    iconPath: "/logos/microcms.svg",
    url: "https://microcms-mcp-67726874216.asia-northeast1.run.app/mcp",
    transportType: "STREAMABLE_HTTPS" as const,
    envVarKeys: ["X-API-Key", "X-Service-ID"],
    authType: "API_KEY" as const,
    useCloudRunIam: true,
    visibility: "PUBLIC" as const,
  },
  {
    name: "n8n MCP",
    description: "n8n API統合 - ワークフロー自動化",
    tags: ["オートメーション", "ワークフロー", "ツール"],
    iconPath: "/logos/n8n.png",
    url: "https://n8n-mcp-67726874216.asia-northeast1.run.app/mcp",
    transportType: "STREAMABLE_HTTPS" as const,
    envVarKeys: [
      "X-MCP-Mode",
      "X-Log-Level",
      "X-Disable-Console-Output",
      "X-N8N-API-Key",
      "X-N8N-API-URL",
    ],
    authType: "API_KEY" as const,
    useCloudRunIam: true,
    visibility: "PUBLIC" as const,
  },
  {
    name: "Slack MCP",
    description: "Slack統合",
    tags: ["チャット", "コミュニケーション", "ツール"],
    iconPath: "/logos/slack.svg",
    url: "https://slack-mcp-67726874216.asia-northeast1.run.app/mcp",
    transportType: "STREAMABLE_HTTPS" as const,
    envVarKeys: ["X-Slack-MCP-XOXP-Token"],
    authType: "API_KEY" as const,
    useCloudRunIam: true,
    visibility: "PUBLIC" as const,
  },
  {
    name: "YouTube MCP",
    description:
      "YouTube Data API統合 - 動画検索、チャンネル情報、再生リストへのアクセス",
    tags: ["動画", "メディア", "ツール"],
    iconPath: "/logos/youtube.svg",
    url: "https://youtube-mcp-67726874216.asia-northeast1.run.app/mcp",
    transportType: "STREAMABLE_HTTPS" as const,
    envVarKeys: ["X-YouTube-API-Key"],
    authType: "API_KEY" as const,
    useCloudRunIam: true,
    visibility: "PUBLIC" as const,
  },
];
