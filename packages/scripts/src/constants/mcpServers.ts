import type { Prisma } from "@prisma/client";

import { normalizeServerName } from "../utils/normalizeServerName.js";

/**
 * db に登録する MCP サーバーテンプレート一覧
 *
 * リモートMCPサーバー専用 (STREAMABLE_HTTPS / SSE トランスポート)
 * STDIO タイプは廃止されました
 */
export const MCP_SERVERS: Prisma.McpServerTemplateCreateWithoutMcpToolsInput[] =
  [
    // ========================================
    // Public Remote MCP Servers (認証なし)
    // ========================================
    {
      name: "Context7",
      normalizedName: normalizeServerName("Context7"),
      description:
        "ライブラリドキュメント検索サービス - 最新のドキュメントをリアルタイムで取得",
      tags: ["ドキュメント", "検索", "ツール"],
      iconPath: "/logos/context7.svg",
      url: "https://mcp.context7.com/mcp",
      transportType: "STREAMABLE_HTTPS" as const,
      envVarKeys: [],
      authType: "NONE" as const,
      visibility: "PUBLIC" as const,
    },
    // ========================================
    // OAuth Remote MCP Servers (DCR対応)
    // ========================================
    {
      name: "Figma MCP",
      normalizedName: normalizeServerName("Figma MCP"),
      description:
        "Figma 公式MCPサーバー - デザインファイルの読み取りとコード生成",
      tags: ["デザイン", "UI/UX", "ツール"],
      iconPath: "/logos/figma.svg",
      url: "https://mcp.figma.com/mcp",
      transportType: "STREAMABLE_HTTPS" as const,
      envVarKeys: [],
      authType: "OAUTH" as const,
      oauthProvider: "figma",
      oauthScopes: ["mcp:connect"],
      visibility: "PUBLIC" as const,
    },
    {
      name: "Linear MCP",
      normalizedName: normalizeServerName("Linear MCP"),
      description:
        "Linear プロジェクト管理サービス - イシュー、プロジェクト、チーム情報へのアクセス",
      tags: ["プロジェクト管理", "イシュー管理", "ツール"],
      iconPath: "/logos/linear.svg",
      url: "https://mcp.linear.app/mcp",
      transportType: "STREAMABLE_HTTPS" as const,
      envVarKeys: [],
      authType: "OAUTH" as const,
      oauthProvider: "linear",
      visibility: "PUBLIC" as const,
    },
    {
      name: "Notion MCP",
      normalizedName: normalizeServerName("Notion MCP"),
      description:
        "Notion ワークスペース統合 - ページ、データベース、コメントへのライブアクセス",
      tags: ["ドキュメント", "ナレッジベース", "ツール"],
      iconPath: "/logos/notion.svg",
      url: "https://mcp.notion.com/mcp",
      transportType: "STREAMABLE_HTTPS" as const,
      envVarKeys: [],
      authType: "OAUTH" as const,
      oauthProvider: "notion",
      visibility: "PUBLIC" as const,
    },
    // {
    //   name: "GitHub MCP",
    //   normalizedName: normalizeServerName("GitHub MCP"),
    //   description:
    //     "GitHub 公式MCPサーバー - リポジトリ、イシュー、PR、ワークフローの管理",
    //   tags: ["開発", "バージョン管理", "CI/CD", "ツール"],
    //   iconPath: "/logos/github.svg",
    //   url: "https://api.githubcopilot.com/mcp",
    //   transportType: "STREAMABLE_HTTPS" as const,
    //   envVarKeys: [],
    //   authType: "OAUTH" as const,
    //   oauthProvider: "github",
    //   visibility: "PUBLIC" as const,
    // },
    {
      name: "Atlassian MCP",
      normalizedName: normalizeServerName("Atlassian MCP"),
      description:
        "Atlassian 公式MCPサーバー - Jira、Confluenceとの統合アクセス",
      tags: ["プロジェクト管理", "ドキュメント", "コラボレーション", "ツール"],
      iconPath: "/logos/atlassian.svg",
      url: "https://mcp.atlassian.com/v1/sse",
      transportType: "SSE" as const,
      envVarKeys: [],
      authType: "OAUTH" as const,
      oauthProvider: "atlassian",
      visibility: "PUBLIC" as const,
    },
    // ========================================
    // Cloud Run Remote MCP Servers
    // ========================================
    // Cloud Run にデプロイされた MCP サーバー
    // URL は実際のデプロイ先に置き換える必要があります
    {
      name: "DeepL MCP",
      normalizedName: normalizeServerName("DeepL MCP"),
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
  ];
