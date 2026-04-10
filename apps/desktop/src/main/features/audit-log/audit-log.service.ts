import { getDb } from "../../shared/db";
import * as repository from "./audit-log.repository";
import type {
  AuditLogItem,
  AuditLogListInput,
  AuditLogListResult,
} from "./audit-log.types";

/** レンダラーがperPageを省略した場合のフォールバック値 */
const FALLBACK_PER_PAGE = 20;

/**
 * AuditLogレコードをIPC通信用の型に変換
 */
const toAuditLogItem = (record: {
  id: number;
  toolName: string;
  method: string;
  transportType: "STDIO" | "SSE" | "STREAMABLE_HTTP";
  durationMs: number;
  inputBytes: number;
  outputBytes: number;
  isSuccess: boolean;
  errorCode: number | null;
  errorSummary: string | null;
  createdAt: Date;
  serverId: number;
  connectionName: string | null;
}): AuditLogItem => ({
  ...record,
  createdAt: record.createdAt.toISOString(),
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
    statusFilter: input.statusFilter,
    dateFrom: input.dateFrom,
    dateTo: input.dateTo,
  };

  const [records, totalCount] = await Promise.all([
    repository.findByServer(db, {
      ...filterParams,
      skip,
      take: perPage,
    }),
    repository.countByServer(db, filterParams),
  ]);

  return {
    items: records.map(toAuditLogItem),
    totalCount,
    totalPages: Math.ceil(totalCount / perPage),
    currentPage: page,
  };
};
