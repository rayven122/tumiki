import { getDb } from "../../shared/db";
import * as repository from "./audit-log.repository";
import * as logger from "../../shared/utils/logger";
import type { ToolCalledPayload } from "@tumiki/mcp-proxy-core";
import type {
  AuditLogItem,
  AuditLogClearResult,
  AuditLogListInput,
  AuditLogListResult,
} from "./audit-log.types";

/** レンダラーがperPageを省略した場合のフォールバック値 */
const FALLBACK_PER_PAGE = 20;
const PREFIX_SEPARATOR = "__";
const LOG_RETENTION_DAYS = 7;
const AUTO_CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000;

/** Prisma AuditLogレコードの型 */
type AuditLogRecord = Awaited<
  ReturnType<typeof repository.findByServer>
>[number];

/**
 * AuditLogレコードをIPC通信用の型に変換
 */
const toAuditLogItem = (record: AuditLogRecord): AuditLogItem => ({
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
    // "all" はフィルターなしと同義なのでundefinedに正規化
    statusFilter: input.statusFilter === "all" ? undefined : input.statusFilter,
    dateFrom: input.dateFrom,
    dateTo: input.dateTo,
  };

  const [records, totalCount, stats] = await Promise.all([
    repository.findByServer(db, {
      ...filterParams,
      skip,
      take: perPage,
    }),
    repository.countByServer(db, filterParams),
    repository.aggregateByServer(db, filterParams),
  ]);

  return {
    items: records.map(toAuditLogItem),
    totalCount,
    totalPages: Math.ceil(totalCount / perPage),
    currentPage: page,
    successRate:
      totalCount > 0 ? Math.round((stats.successCount / totalCount) * 100) : 0,
    avgDurationMs: stats.avgDurationMs,
  };
};

/**
 * プレフィックス付きツール名からサーバー情報を解決
 * ToolAggregatorと同じ "__" 区切りでパースする
 */
const resolveServerInfo = async (
  prefixedToolName: string,
): Promise<{
  serverId: number;
  connectionName: string;
  toolName: string;
  transportType: "STDIO" | "SSE" | "STREAMABLE_HTTP";
} | null> => {
  const idx = prefixedToolName.indexOf(PREFIX_SEPARATOR);
  if (idx <= 0) return null;

  const serverName = prefixedToolName.slice(0, idx);
  const toolName = prefixedToolName.slice(idx + PREFIX_SEPARATOR.length);

  const db = await getDb();
  const connection = await db.mcpConnection.findFirst({
    where: { name: serverName },
    select: { serverId: true, name: true, transportType: true },
  });

  if (!connection) return null;

  return {
    serverId: connection.serverId,
    connectionName: connection.name,
    toolName,
    transportType: connection.transportType,
  };
};

/**
 * Proxy Processのtool-calledイベントから監査ログを記録
 * プレフィックス付きツール名の解決からDB記録までを一括で行う（fire-and-forget: 例外を投げない）
 */
export const recordMcpToolCall = async (
  payload: ToolCalledPayload,
): Promise<void> => {
  try {
    const serverInfo = await resolveServerInfo(payload.prefixedToolName);
    if (!serverInfo) {
      logger.warn("監査ログ: サーバー情報を解決できません", {
        toolName: payload.prefixedToolName,
      });
      return;
    }

    const db = await getDb();
    await repository.create(db, {
      toolName: serverInfo.toolName,
      method: "tools/call",
      transportType: serverInfo.transportType,
      durationMs: payload.durationMs,
      inputBytes: payload.inputBytes,
      outputBytes: payload.outputBytes,
      isSuccess: payload.isSuccess,
      errorCode: null,
      errorSummary: payload.errorMessage,
      serverId: serverInfo.serverId,
      connectionName: serverInfo.connectionName,
    });
  } catch (error) {
    logger.error(
      "監査ログの記録に失敗しました",
      error instanceof Error ? error : { error },
    );
  }
};

/**
 * 7日以上古いログを削除
 */
export const clearOldLogs = async (): Promise<AuditLogClearResult> => {
  const db = await getDb();
  const threshold = new Date(
    Date.now() - LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000,
  );
  const deletedCount = await repository.deleteOlderThan(db, threshold);
  if (deletedCount > 0) {
    logger.info(`古い監査ログを${deletedCount}件削除しました`);
  }
  return { deletedCount };
};

let cleanupTimer: ReturnType<typeof setInterval> | null = null;

/**
 * 古いログの自動削除を開始（24時間ごとに実行）
 */
export const startAutoCleanup = (): void => {
  if (cleanupTimer !== null) return;

  cleanupTimer = setInterval(() => {
    void clearOldLogs().catch((error) => {
      logger.error(
        "自動ログクリーンアップに失敗しました",
        error instanceof Error ? error : { error },
      );
    });
  }, AUTO_CLEANUP_INTERVAL_MS);
};

/**
 * 自動削除を停止
 */
export const stopAutoCleanup = (): void => {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
};
