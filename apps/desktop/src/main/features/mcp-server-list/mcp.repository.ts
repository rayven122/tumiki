import type { ServerStatus } from "@prisma/desktop-client";
import type { DbClient } from "../../shared/db";

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
  // 仮想MCPで複数接続を束ねた際の並び順（省略時はDB既定の0）
  displayOrder?: number;
};

/**
 * McpTool 作成時の入力データ型
 * 仮想MCP作成時に各接続のツール一覧から保存する用途
 */
export type CreateMcpToolInput = {
  /// 元MCPから取得したツール名（ルーティング識別子）
  name: string;
  /// 元の説明
  description: string;
  /// 入力スキーマ（JSON Schema文字列）
  inputSchema: string;
  /// カスタム説明（nullなら元のdescriptionを使用）
  customDescription?: string | null;
  /// ツールの公開可否
  isAllowed: boolean;
  /// 親接続のID
  connectionId: number;
};

/**
 * MCPサーバーを接続情報付きで全件取得
 */
export const findAllWithConnections = async (db: DbClient) => {
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
  db: DbClient,
  data: CreateMcpServerInput,
) => {
  return db.mcpServer.create({ data });
};

/**
 * MCP接続を作成
 */
export const createConnection = async (
  db: DbClient,
  data: CreateMcpConnectionInput,
) => {
  return db.mcpConnection.create({ data });
};

/**
 * McpTool を一括作成（仮想MCP作成時）
 * createManyだとSQLite制約により返却値が件数のみのため、
 * パフォーマンスは多少劣るが個別createで一貫性を取る
 */
export const createTools = async (
  db: DbClient,
  tools: CreateMcpToolInput[],
) => {
  for (const tool of tools) {
    await db.mcpTool.create({ data: tool });
  }
};

/**
 * 指定サーバーslug配下のMcpToolを全件取得（proxy起動時のpolicy解決用）
 * proxy 側からは configName (`${serverSlug}-${connectionSlug}`) で参照されるため、
 * server.slug と connection.slug 両方を含めて返す
 */
export const findToolsByServerSlug = async (
  db: DbClient,
  serverSlug: string,
) => {
  return db.mcpTool.findMany({
    where: {
      connection: {
        server: { slug: serverSlug },
      },
    },
    include: {
      connection: {
        select: {
          slug: true,
          server: { select: { slug: true } },
        },
      },
    },
  });
};

/**
 * slugでサーバーを検索
 */
export const findServerBySlug = async (db: DbClient, slug: string) => {
  return db.mcpServer.findUnique({ where: { slug } });
};

/**
 * 名前でサーバーを検索（重複チェック用）
 */
export const findServerByName = async (db: DbClient, name: string) => {
  return db.mcpServer.findFirst({ where: { name } });
};

/**
 * 有効なサーバーの有効な接続を全件取得（Proxy起動時のconfig生成用）
 */
export const findEnabledConnections = async (db: DbClient) => {
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
 * 指定サーバーslugの有効な接続を取得（--server指定時のconfig生成用）
 */
export const findEnabledConnectionsBySlug = async (
  db: DbClient,
  serverSlug: string,
) => {
  return db.mcpConnection.findMany({
    where: {
      isEnabled: true,
      server: { isEnabled: true, slug: serverSlug },
    },
    include: { server: true },
    orderBy: { displayOrder: "asc" },
  });
};

/**
 * IDでサーバーを取得
 */
export const findServerById = async (db: DbClient, id: number) => {
  return db.mcpServer.findUnique({ where: { id } });
};

/**
 * サーバー情報を更新
 */
export const updateServer = async (
  db: DbClient,
  id: number,
  data: { name?: string; description?: string },
) => {
  return db.mcpServer.update({ where: { id }, data });
};

/**
 * サーバーを削除（カスケードで接続も削除）
 */
export const deleteServer = async (db: DbClient, id: number) => {
  return db.mcpServer.delete({ where: { id } });
};

/**
 * サーバーのenabled状態を切り替え
 */
export const toggleServerEnabled = async (
  db: DbClient,
  id: number,
  isEnabled: boolean,
) => {
  return db.mcpServer.update({ where: { id }, data: { isEnabled } });
};

/**
 * サーバーの稼働状態を更新（CLIモードからのステータス同期用）
 */
export const updateServerStatus = async (
  db: DbClient,
  id: number,
  serverStatus: ServerStatus,
) => {
  return db.mcpServer.update({ where: { id }, data: { serverStatus } });
};

/**
 * 全サーバーのステータスを一括更新（シャットダウン時の一括STOPPED化等）
 */
export const updateAllServerStatus = async (
  db: DbClient,
  serverStatus: ServerStatus,
) => {
  return db.mcpServer.updateMany({ data: { serverStatus } });
};
