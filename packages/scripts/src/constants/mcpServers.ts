// cSpell:words cloudrun deepl
import type { Prisma } from "@prisma/client";

/**
 * db に登録する MCP サーバー一覧
 *
 * リモートMCPサーバー専用 (STREAMABLE_HTTPS / SSE トランスポート)
 * STDIO タイプは廃止されました
 */
export const MCP_SERVERS = [
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
    envVars: [],
    authType: "NONE" as const,
    isPublic: true,
  },
  // ========================================
  // Cloud Run Remote MCP Servers
  // ========================================
  // Cloud Run にデプロイされた MCP サーバー
  // URL は実際のデプロイ先に置き換える必要があります
  // 設定方法は docs/cloudrun-mcp-integration.md を参照
  {
    name: "DeepL MCP",
    description: "Cloud Run にデプロイされた DeepL 翻訳サービス",
    tags: ["翻訳", "ツール", "リモート"],
    iconPath: "/logos/deepl.svg",
    url: "https://deepl-mcp-67726874216.asia-northeast1.run.app/mcp",
    transportType: "STREAMABLE_HTTPS" as const,
    // Cloud Run認証はgoogle-auth-libraryで自動取得（authType: CLOUD_RUN_IAM）
    // envVarsはMCPサーバー用のカスタムヘッダーのみ
    envVars: ["X-DeepL-API-Key"],
    authType: "CLOUD_RUN_IAM" as const,
    isPublic: true,
  },
  {
    name: "Figma MCP",
    description: "Cloud Run にデプロイされた Figma デザイン連携",
    tags: ["デザイン", "UI/UX", "リモート"],
    iconPath: "/logos/figma.svg",
    url: "https://figma-mcp-67726874216.asia-northeast1.run.app/mcp",
    transportType: "STREAMABLE_HTTPS" as const,
    // Cloud Run認証はgoogle-auth-libraryで自動取得（authType: CLOUD_RUN_IAM）
    // envVarsはMCPサーバー用のカスタムヘッダーのみ
    envVars: ["X-Figma-API-Key"],
    authType: "CLOUD_RUN_IAM" as const,
    isPublic: true,
  },
] as const satisfies Prisma.McpServerCreateWithoutToolsInput[];
