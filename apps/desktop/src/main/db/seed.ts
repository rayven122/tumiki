import type { PrismaClient } from "../../../prisma/generated/client";
import * as logger from "../utils/logger";

/**
 * Desktop用MCPカタログのシードデータ
 * packages/scripts/src/constants/stdioMcpServers.ts を参考に定義
 */
const CATALOG_SEEDS = [
  {
    name: "Filesystem STDIO",
    description:
      "ファイルシステム操作 - ローカルファイルの読み書き（開発・テスト用）",
    iconPath: "/logos/services/database.svg",
    transportType: "STDIO" as const,
    command: "npx",
    args: JSON.stringify([
      "-y",
      "@modelcontextprotocol/server-filesystem",
      "/tmp",
    ]),
    credentialKeys: JSON.stringify([]),
    authType: "NONE" as const,
    isOfficial: true,
  },
  {
    name: "GitHub STDIO",
    description: "GitHub API - リポジトリ、イシュー、PR の操作",
    iconPath: "/logos/services/github_black.svg",
    transportType: "STDIO" as const,
    command: "npx",
    args: JSON.stringify(["-y", "@modelcontextprotocol/server-github"]),
    credentialKeys: JSON.stringify(["GITHUB_PERSONAL_ACCESS_TOKEN"]),
    authType: "API_KEY" as const,
    isOfficial: true,
  },
  {
    name: "GitLab STDIO",
    description: "GitLab API - プロジェクト、イシュー、MR の操作",
    iconPath: "/logos/services/database.svg",
    transportType: "STDIO" as const,
    command: "npx",
    args: JSON.stringify(["-y", "@modelcontextprotocol/server-gitlab"]),
    credentialKeys: JSON.stringify([
      "GITLAB_PERSONAL_ACCESS_TOKEN",
      "GITLAB_API_URL",
    ]),
    authType: "API_KEY" as const,
    isOfficial: true,
  },
  {
    name: "PostgreSQL STDIO",
    description: "PostgreSQL データベース - SQL クエリの実行とスキーマ操作",
    iconPath: "/logos/services/postgresql.svg",
    transportType: "STDIO" as const,
    command: "npx",
    args: JSON.stringify(["-y", "@modelcontextprotocol/server-postgres"]),
    credentialKeys: JSON.stringify(["POSTGRESQL_CONNECTION_STRING"]),
    authType: "API_KEY" as const,
    isOfficial: true,
  },
  {
    name: "Slack STDIO",
    description: "Slack API - メッセージの送受信とチャンネル操作",
    iconPath: "/logos/services/slack.svg",
    transportType: "STDIO" as const,
    command: "npx",
    args: JSON.stringify(["-y", "@modelcontextprotocol/server-slack"]),
    credentialKeys: JSON.stringify(["SLACK_BOT_TOKEN", "SLACK_TEAM_ID"]),
    authType: "API_KEY" as const,
    isOfficial: true,
  },
  {
    name: "Sequential Thinking STDIO",
    description: "段階的思考サーバー - 複雑な問題解決のための段階的推論支援",
    iconPath: "/logos/services/database.svg",
    transportType: "STDIO" as const,
    command: "npx",
    args: JSON.stringify([
      "-y",
      "@modelcontextprotocol/server-sequential-thinking",
    ]),
    credentialKeys: JSON.stringify([]),
    authType: "NONE" as const,
    isOfficial: true,
  },
  {
    name: "Serena MCP",
    description:
      "Serena コードベース分析 - プロジェクト構造の理解とコードナビゲーション",
    iconPath: "/logos/services/database.svg",
    transportType: "STDIO" as const,
    command: "npx",
    args: JSON.stringify(["-y", "@anthropic/serena-mcp"]),
    credentialKeys: JSON.stringify([]),
    authType: "NONE" as const,
    isOfficial: true,
  },
] as const;

/**
 * McpCatalogテーブルにシードデータをupsert
 * nameをキーとして冪等に投入（既存データは更新、新規データは挿入）
 */
export const seedCatalog = async (db: PrismaClient): Promise<void> => {
  for (const seed of CATALOG_SEEDS) {
    await db.mcpCatalog.upsert({
      where: { name: seed.name },
      update: {
        description: seed.description,
        iconPath: seed.iconPath,
        transportType: seed.transportType,
        command: seed.command,
        args: seed.args,
        credentialKeys: seed.credentialKeys,
        authType: seed.authType,
        isOfficial: seed.isOfficial,
      },
      create: seed,
    });
  }

  logger.info(`Seeded ${CATALOG_SEEDS.length} MCP catalog entries`);
};
