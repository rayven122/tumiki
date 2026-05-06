import type { ServerStatus, ServerType } from "@prisma/desktop-client";
import type { DbClient } from "../../shared/db";

/**
 * MCPサーバー作成時の入力データ型
 * `serverType` は呼び出し元（カタログ/カスタム入力経路は OFFICIAL、仮想MCP作成経路は CUSTOM）が
 * 明示的に渡すことで「どの経路で生成されたサーバーか」をDBレベルで保持する。
 */
export type CreateMcpServerInput = {
  name: string;
  slug: string;
  description: string;
  serverType: ServerType;
};

// 仮想MCPは共有元の secretId を渡す。それ以外は createSecret で先に作成した id を渡す。
export type CreateMcpConnectionInput = {
  name: string;
  slug: string;
  transportType: "STDIO" | "SSE" | "STREAMABLE_HTTP";
  command: string | null;
  args: string;
  url: string | null;
  secretId: number;
  authType: "NONE" | "BEARER" | "API_KEY" | "OAUTH";
  serverId: number;
  catalogId: number | null;
  // 仮想MCPで複数接続を束ねた際の並び順（省略時はDB既定の0）
  displayOrder?: number;
};

/**
 * MCPツール作成時の入力データ型（接続単位で一括投入する）
 */
export type CreateMcpToolInput = {
  name: string;
  description: string;
  inputSchema: string;
  connectionId: number;
  isAllowed?: boolean;
};

// 一覧表示の負荷削減のため、ツール本体はロードせず `_count.tools` で件数のみ取得する。
// credentials は renderer に返さないため secret は include しない。
export const findAllWithConnections = async (db: DbClient) => {
  return db.mcpServer.findMany({
    include: {
      connections: {
        include: {
          catalog: {
            select: { id: true, name: true, description: true, iconPath: true },
          },
          _count: {
            select: { tools: true },
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

export const createSecret = async (db: DbClient, credentials: string) => {
  return db.mcpSecret.create({ data: { credentials } });
};

// 参照カウント0なら secret 削除。参照中は onDelete: Restrict が DB レベルでガードする。
export const deleteSecretIfOrphaned = async (
  db: DbClient,
  secretId: number,
): Promise<void> => {
  const remaining = await db.mcpConnection.count({ where: { secretId } });
  if (remaining === 0) {
    await db.mcpSecret.delete({ where: { id: secretId } });
  }
};

/**
 * 指定接続のツールを一括作成（接続新規登録直後のツール初期投入用）
 */
export const createTools = async (db: DbClient, data: CreateMcpToolInput[]) => {
  if (data.length === 0) return { count: 0 };
  return db.mcpTool.createMany({ data });
};

/**
 * 指定接続のツール名と許可状態を取得（CLI モードの動的フィルタ resolver 用）
 */
export const findToolsByConnectionId = async (
  db: DbClient,
  connectionId: number,
) => {
  return db.mcpTool.findMany({
    where: { connectionId },
    select: { name: true, isAllowed: true },
  });
};

export const findConnectionByIdWithServer = async (
  db: DbClient,
  connectionId: number,
) => {
  return db.mcpConnection.findUnique({
    where: { id: connectionId },
    include: {
      server: true,
      secret: { select: { credentials: true } },
    },
  });
};

export const findConnectionsByIdsWithTools = async (
  db: DbClient,
  connectionIds: number[],
) => {
  if (connectionIds.length === 0) return [];
  return db.mcpConnection.findMany({
    where: { id: { in: connectionIds } },
    include: {
      // サーバーの有効状態に加え、serverType を取得することで「仮想MCP（CUSTOM）配下の接続を
      // 新しい仮想MCPの素材として再ネストしない」ことをサービス層でDBレベルに依拠して保証する
      server: {
        select: {
          isEnabled: true,
          serverType: true,
        },
      },
      tools: {
        select: {
          name: true,
          description: true,
          inputSchema: true,
          isAllowed: true,
        },
        orderBy: { name: "asc" },
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

export const findEnabledConnections = async (db: DbClient) => {
  return db.mcpConnection.findMany({
    where: {
      isEnabled: true,
      server: { isEnabled: true },
    },
    include: {
      server: true,
      secret: { select: { credentials: true } },
      tools: {
        select: { name: true, isAllowed: true },
      },
    },
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
    include: {
      server: true,
      secret: { select: { credentials: true } },
      tools: {
        select: { name: true, isAllowed: true },
      },
    },
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

// 接続のカスケード削除に伴う孤立 secret の掃除は service 層で行う（参照カウント運用）。
export const deleteServer = async (db: DbClient, id: number) => {
  return db.mcpServer.delete({ where: { id } });
};

export const findSecretIdsByServerId = async (
  db: DbClient,
  serverId: number,
): Promise<number[]> => {
  const connections = await db.mcpConnection.findMany({
    where: { serverId },
    select: { secretId: true },
  });
  return connections.map((c) => c.secretId);
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
 * サーバーのPIIマスキング有効状態を切り替え
 * 反映は次回プロキシ起動時（再起動必要）
 */
export const updateIsPiiMaskingEnabled = async (
  db: DbClient,
  id: number,
  enabled: boolean,
) => {
  return db.mcpServer.update({
    where: { id },
    data: { isPiiMaskingEnabled: enabled },
  });
};

/**
 * サーバーのTOON変換（レスポンス圧縮）有効状態を切り替え
 * 反映は次回プロキシ起動時（再起動必要）
 */
export const updateIsToonConversionEnabled = async (
  db: DbClient,
  id: number,
  enabled: boolean,
) => {
  return db.mcpServer.update({
    where: { id },
    data: { isToonConversionEnabled: enabled },
  });
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
