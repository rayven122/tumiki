import type { Prisma } from "@prisma/desktop-client";
import { postManagerJson } from "../../shared/manager-api-client";
import * as logger from "../../shared/utils/logger";

const POST_TIMEOUT_MS = 10_000;

const toOccurredAt = (
  value: Prisma.AuditLogUncheckedCreateInput["createdAt"],
): string => {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string" || typeof value === "number") {
    return new Date(value).toISOString();
  }
  return new Date().toISOString();
};

const toInteger = (value: unknown, fallback = 0): number => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  return fallback;
};

const buildRemoteLog = (input: Prisma.AuditLogUncheckedCreateInput) => ({
  mcpServerId: String(input.serverId),
  toolName: String(input.toolName).slice(0, 255),
  method: String(input.method).slice(0, 64),
  httpStatus: input.isSuccess === false ? 500 : 200,
  durationMs: toInteger(input.durationMs),
  inputBytes: toInteger(input.inputBytes),
  outputBytes: toInteger(input.outputBytes),
  errorCode:
    input.errorCode === null || input.errorCode === undefined
      ? undefined
      : toInteger(input.errorCode),
  errorSummary:
    input.errorSummary === null || input.errorSummary === undefined
      ? undefined
      : String(input.errorSummary).slice(0, 500),
  occurredAt: toOccurredAt(input.createdAt),
});

/**
 * Manager連携済みの場合、ローカル監査ログをinternal-managerへ送信する。
 *
 * 送信はベストエフォート。Manager未設定・未認証・通信失敗はMCP実行結果へ影響させない。
 */
export const syncAuditLogToManager = async (
  input: Prisma.AuditLogUncheckedCreateInput,
): Promise<boolean> => {
  try {
    const response = await postManagerJson(
      "/api/internal/audit-logs",
      { logs: [buildRemoteLog(input)] },
      {
        signal: AbortSignal.timeout(POST_TIMEOUT_MS),
      },
    );
    if (!response) return false;

    if (!response.ok) {
      logger.warn("Failed to sync audit log to manager", {
        status: response.status,
      });
      return false;
    }

    return true;
  } catch (error) {
    logger.warn("Failed to sync audit log to manager", {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
};
