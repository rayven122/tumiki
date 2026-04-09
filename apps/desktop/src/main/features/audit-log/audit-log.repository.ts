import type { PrismaClient, Prisma } from "@prisma/desktop-client";

/**
 * 監査ログ検索の共通パラメータ型
 * serverIdをオプショナルにすることで、将来の全サーバー横断検索にも対応
 */
type AuditLogQueryParams = {
  serverId?: number;
  cursor?: { createdAt: string; id: number };
  limit: number;
  statusFilter?: "all" | "success" | "error";
  dateFrom?: string;
  dateTo?: string;
};

/**
 * 共通のPrisma where句を構築
 * serverIdの有無で単一サーバー/全サーバー検索を切り替える
 */
const buildWhereClause = (
  params: AuditLogQueryParams,
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
      where.createdAt.gte = new Date(params.dateFrom);
    }
    if (params.dateTo) {
      // dateTo は日付の終わりまでを含む
      where.createdAt.lte = new Date(`${params.dateTo}T23:59:59.999Z`);
    }
  }

  // カーソルベースページネーション
  if (params.cursor) {
    const cursorDate = new Date(params.cursor.createdAt);
    where.OR = [
      { createdAt: { lt: cursorDate } },
      {
        createdAt: cursorDate,
        id: { lt: params.cursor.id },
      },
    ];
  }

  return where;
};

/**
 * サーバー指定で監査ログを取得（カーソルベースページネーション）
 */
export const findByServer = async (
  db: PrismaClient,
  params: AuditLogQueryParams & { serverId: number },
) => {
  return db.auditLog.findMany({
    where: buildWhereClause(params),
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: params.limit + 1,
  });
};

/**
 * サーバー指定で監査ログの総件数を取得（フィルター条件適用）
 */
export const countByServer = async (
  db: PrismaClient,
  params: Omit<AuditLogQueryParams, "cursor" | "limit"> & { serverId: number },
) => {
  const where = buildWhereClause({ ...params, limit: 0 });
  // カーソル条件はカウントには不要なので除去
  delete where.OR;
  return db.auditLog.count({ where });
};
