import type { PrismaClient } from "../../../../prisma/generated/client";

/**
 * MCPサーバー作成時の入力データ型
 */
export type CreateMcpServerInput = {
  name: string;
  slug: string;
  description: string;
};

/**
 * MCP接続作成時の入力データ型
 */
export type CreateMcpConnectionInput = {
  name: string;
  slug: string;
  transportType: "STDIO" | "SSE" | "STREAMABLE_HTTP";
  command: string | null;
  args: string;
  url: string | null;
  credentials: string;
  authType: "NONE" | "BEARER" | "API_KEY" | "OAUTH";
  serverId: number;
  catalogId: number | null;
};

/**
 * MCPサーバーを接続情報付きで全件取得
 */
export const findAllWithConnections = async (db: PrismaClient) => {
  return db.mcpServer.findMany({
    include: { connections: true },
    orderBy: { createdAt: "desc" },
  });
};

/**
 * MCPサーバーを作成
 */
export const createServer = async (
  db: PrismaClient,
  data: CreateMcpServerInput,
) => {
  return db.mcpServer.create({ data });
};

/**
 * MCP接続を作成
 */
export const createConnection = async (
  db: PrismaClient,
  data: CreateMcpConnectionInput,
) => {
  return db.mcpConnection.create({ data });
};

/**
 * slugでサーバーを検索
 */
export const findServerBySlug = async (db: PrismaClient, slug: string) => {
  return db.mcpServer.findUnique({ where: { slug } });
};

/**
 * 名前でサーバーを検索（重複チェック用）
 */
export const findServerByName = async (db: PrismaClient, name: string) => {
  return db.mcpServer.findFirst({ where: { name } });
};

/**
 * MCP接続を全件取得（カタログ情報付き）
 */
export const findAllConnections = async (db: PrismaClient) => {
  return db.mcpConnection.findMany({
    include: { catalog: true },
    orderBy: { createdAt: "desc" },
  });
};
