import { getDb } from "../../shared/db";
import * as repository from "./audit-log.repository";
import type {
  AuditLogItem,
  AuditLogListInput,
  AuditLogListResult,
} from "./audit-log.types";

const DEFAULT_LIMIT = 20;

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
  const limit = input.limit ?? DEFAULT_LIMIT;

  const [records, totalCount] = await Promise.all([
    repository.findByServer(db, {
      serverId: input.serverId,
      cursor: input.cursor,
      limit,
      statusFilter: input.statusFilter,
      dateFrom: input.dateFrom,
      dateTo: input.dateTo,
    }),
    repository.countByServer(db, {
      serverId: input.serverId,
      statusFilter: input.statusFilter,
      dateFrom: input.dateFrom,
      dateTo: input.dateTo,
    }),
  ]);

  // limit + 1 件取得しているので、超過分があれば次ページあり
  const hasMore = records.length > limit;
  const items = hasMore ? records.slice(0, limit) : records;
  const lastItem = items[items.length - 1];

  return {
    items: items.map(toAuditLogItem),
    nextCursor:
      hasMore && lastItem
        ? { createdAt: lastItem.createdAt.toISOString(), id: lastItem.id }
        : null,
    totalCount,
  };
};
