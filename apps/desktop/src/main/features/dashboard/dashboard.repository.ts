import type { PrismaClient, ServerStatus } from "@prisma/desktop-client";

/**
 * ダッシュボード集計用に取得する監査ログの最小カラム
 */
export type AuditLogSlim = {
  id: number;
  createdAt: Date;
  connectionName: string | null;
  toolName: string;
  clientName: string | null;
  isSuccess: boolean;
  durationMs: number;
};

/**
 * 期間内の監査ログを集計用カラムだけで取得（並べ替えは時刻昇順）
 */
export const findAuditLogsInRange = async (
  db: PrismaClient,
  range: { from: Date; to: Date },
): Promise<AuditLogSlim[]> => {
  return db.auditLog.findMany({
    where: { createdAt: { gte: range.from, lt: range.to } },
    select: {
      id: true,
      createdAt: true,
      connectionName: true,
      toolName: true,
      clientName: true,
      isSuccess: true,
      durationMs: true,
    },
    orderBy: { createdAt: "asc" },
  });
};

/**
 * 期間内の監査ログ件数（前期比較用に総数と成功数のみ集計）
 */
export const countAuditLogsInRange = async (
  db: PrismaClient,
  range: { from: Date; to: Date },
): Promise<{ total: number; success: number }> => {
  const where = { createdAt: { gte: range.from, lt: range.to } };
  const [total, success] = await Promise.all([
    db.auditLog.count({ where }),
    db.auditLog.count({ where: { ...where, isSuccess: true } }),
  ]);
  return { total, success };
};

/**
 * 直近の監査ログを取得（時刻降順）
 */
export const findRecentAuditLogs = async (
  db: PrismaClient,
  limit: number,
): Promise<AuditLogSlim[]> => {
  return db.auditLog.findMany({
    select: {
      id: true,
      createdAt: true,
      connectionName: true,
      toolName: true,
      clientName: true,
      isSuccess: true,
      durationMs: true,
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit,
  });
};

/** コネクタ表示用のメタデータ */
export type ConnectorWithMeta = {
  serverId: number;
  connectionId: number;
  name: string;
  iconPath: string | null;
  serverStatus: ServerStatus;
};

/**
 * 表示用のコネクタ一覧（有効な接続のみ、サーバー表示順 → 接続表示順）
 */
export const findAllConnectors = async (
  db: PrismaClient,
): Promise<ConnectorWithMeta[]> => {
  const connections = await db.mcpConnection.findMany({
    where: { isEnabled: true, server: { isEnabled: true } },
    select: {
      id: true,
      name: true,
      displayOrder: true,
      catalog: { select: { iconPath: true } },
      server: {
        select: { id: true, serverStatus: true, displayOrder: true },
      },
    },
    orderBy: [{ server: { displayOrder: "asc" } }, { displayOrder: "asc" }],
  });
  return connections.map((c) => ({
    serverId: c.server.id,
    connectionId: c.id,
    name: c.name,
    iconPath: c.catalog?.iconPath ?? null,
    serverStatus: c.server.serverStatus,
  }));
};
