import type { PrismaClient, Prisma } from "@prisma/desktop-client";

/**
 * 監査ログ検索の共通パラメータ型
 * serverIdをオプショナルにすることで、将来の全サーバー横断検索にも対応
 */
type AuditLogQueryParams = {
  serverId?: number;
  skip: number;
  take: number;
  statusFilter?: "all" | "success" | "error";
  dateFrom?: string;
  dateTo?: string;
};

/**
 * 共通のPrisma where句を構築
 * serverIdの有無で単一サーバー/全サーバー検索を切り替える
 */
const buildWhereClause = (
  params: Omit<AuditLogQueryParams, "skip" | "take">,
): Prisma.AuditLogWhereInput => {
  const where: Prisma.AuditLogWhereInput = {};

  if (params.serverId !== undefined) {
    where.serverId = params.serverId;
  }

  // ステータスフィルター
  if (params.statusFilter === "success") {
    where.isSuccess = true;
  } else if (params.statusFilter === "error") {
    where.isSuccess = false;
  }

  // 日付範囲フィルター
  if (params.dateFrom || params.dateTo) {
    where.createdAt = {};
    if (params.dateFrom) {
      where.createdAt.gte = new Date(`${params.dateFrom}T00:00:00`);
    }
    if (params.dateTo) {
      // dateTo は日付の終わりまでを含む（ローカルタイム基準）
      where.createdAt.lte = new Date(`${params.dateTo}T23:59:59.999`);
    }
  }

  return where;
};

/**
 * サーバー指定で監査ログを取得（オフセットベースページネーション）
 */
export const findByServer = async (
  db: PrismaClient,
  params: AuditLogQueryParams & { serverId: number },
) => {
  return db.auditLog.findMany({
    where: buildWhereClause(params),
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: params.skip,
    take: params.take,
  });
};

/**
 * サーバー指定で監査ログの総件数を取得（フィルター条件適用）
 */
export const countByServer = async (
  db: PrismaClient,
  params: Omit<AuditLogQueryParams, "skip" | "take"> & { serverId: number },
) => {
  return db.auditLog.count({ where: buildWhereClause(params) });
};

/**
 * サーバー指定で利用統計を集計（フィルター条件適用、全件対象）
 */
export const aggregateByServer = async (
  db: PrismaClient,
  params: Omit<AuditLogQueryParams, "skip" | "take"> & { serverId: number },
) => {
  const where = buildWhereClause(params);

  const [successCount, avgResult] = await Promise.all([
    db.auditLog.count({ where: { ...where, isSuccess: true } }),
    db.auditLog.aggregate({ where, _avg: { durationMs: true } }),
  ]);

  return {
    successCount,
    avgDurationMs: Math.round(avgResult._avg.durationMs ?? 0),
  };
};
