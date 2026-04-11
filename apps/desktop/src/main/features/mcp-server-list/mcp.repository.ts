import type { PrismaClient } from "@prisma/desktop-client";

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
    include: {
      connections: {
        include: {
          catalog: {
            select: { id: true, name: true, description: true, iconPath: true },
          },
        },
      },
    },
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
 * 有効なサーバーの有効な接続を全件取得（Proxy起動時のconfig生成用）
 */
export const findEnabledConnections = async (db: PrismaClient) => {
  return db.mcpConnection.findMany({
    where: {
      isEnabled: true,
      server: { isEnabled: true },
    },
    include: { server: true },
    orderBy: { displayOrder: "asc" },
  });
};

/**
 * IDでサーバーを取得
 */
export const findServerById = async (db: PrismaClient, id: number) => {
  return db.mcpServer.findUnique({ where: { id } });
};

/**
 * サーバー情報を更新
 */
export const updateServer = async (
  db: PrismaClient,
  id: number,
  data: { name?: string; description?: string },
) => {
  return db.mcpServer.update({ where: { id }, data });
};

/**
 * サーバーを削除（カスケードで接続も削除）
 */
export const deleteServer = async (db: PrismaClient, id: number) => {
  return db.mcpServer.delete({ where: { id } });
};

/**
 * サーバーのenabled状態を切り替え
 */
export const toggleServerEnabled = async (
  db: PrismaClient,
  id: number,
  isEnabled: boolean,
) => {
  return db.mcpServer.update({ where: { id }, data: { isEnabled } });
};
