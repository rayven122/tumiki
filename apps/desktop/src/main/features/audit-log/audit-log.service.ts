import { getDb } from "../../shared/db";
import * as repository from "./audit-log.repository";
import type {
  AuditLogItem,
  AuditLogListAllInput,
  AuditLogListInput,
  AuditLogListResult,
} from "./audit-log.types";

/** レンダラーがperPageを省略した場合のフォールバック値 */
const FALLBACK_PER_PAGE = 20;

/** Prisma AuditLogレコードの型 */
type AuditLogRecord = Awaited<
  ReturnType<typeof repository.findByServer>
>[number];

/**
 * AuditLogレコードをIPC通信用の型に変換
 * piiDetections は writeAuditLog 時に PiiDetectionsSummary 形式でしか書き込まないため
 * Prisma の JsonValue 型を IPC 用の具体型にキャストして渡す
 */
const toAuditLogItem = (record: AuditLogRecord): AuditLogItem => ({
  ...record,
  createdAt: record.createdAt.toISOString(),
  piiDetections: record.piiDetections as AuditLogItem["piiDetections"],
});

/**
 * サーバー指定で監査ログ一覧を取得（ページネーション・フィルター対応）
 */
export const listByServer = async (
  input: AuditLogListInput,
): Promise<AuditLogListResult> => {
  const db = await getDb();
  const page = input.page ?? 1;
  const perPage = input.perPage ?? FALLBACK_PER_PAGE;
  const skip = (page - 1) * perPage;

  const filterParams = {
    serverId: input.serverId,
    // "all" はフィルターなしと同義なのでundefinedに正規化
    statusFilter: input.statusFilter === "all" ? undefined : input.statusFilter,
    dateFrom: input.dateFrom,
    dateTo: input.dateTo,
  };

  // 統計はフィルタに依存しない全体値を返す
  const statsParams = {
    serverId: input.serverId,
    dateFrom: input.dateFrom,
    dateTo: input.dateTo,
  };

  const [records, totalCount, overallCount, stats] = await Promise.all([
    repository.findByServer(db, {
      ...filterParams,
      skip,
      take: perPage,
    }),
    repository.countByServer(db, filterParams),
    repository.countByServer(db, statsParams),
    repository.aggregateByServer(db, statsParams),
  ]);

  return {
    items: records.map(toAuditLogItem),
    totalCount,
    totalPages: Math.ceil(totalCount / perPage),
    currentPage: page,
    overallCount,
    successRate:
      overallCount > 0
        ? Math.round((stats.successCount / overallCount) * 100)
        : 0,
    avgDurationMs: stats.avgDurationMs,
  };
};

/**
 * 全サーバー横断で監査ログ一覧を取得（ページネーション・フィルター対応）
 */
export const listAll = async (
  input: AuditLogListAllInput,
): Promise<AuditLogListResult> => {
  const db = await getDb();
  const page = input.page ?? 1;
  const perPage = input.perPage ?? FALLBACK_PER_PAGE;
  const skip = (page - 1) * perPage;

  const filterParams = {
    statusFilter: input.statusFilter === "all" ? undefined : input.statusFilter,
    dateFrom: input.dateFrom,
    dateTo: input.dateTo,
  };

  // 統計はフィルタに依存しない全体値を返す
  const statsParams = { dateFrom: input.dateFrom, dateTo: input.dateTo };

  const [records, totalCount, overallCount, stats] = await Promise.all([
    repository.findAll(db, { ...filterParams, skip, take: perPage }),
    repository.countAll(db, filterParams),
    repository.countAll(db, statsParams),
    repository.aggregateAll(db, statsParams),
  ]);

  return {
    items: records.map(toAuditLogItem),
    totalCount,
    totalPages: Math.ceil(totalCount / perPage),
    currentPage: page,
    overallCount,
    successRate:
      overallCount > 0
        ? Math.round((stats.successCount / overallCount) * 100)
        : 0,
    avgDurationMs: stats.avgDurationMs,
  };
};
