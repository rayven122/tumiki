import type { AuthToken, Prisma } from "@prisma/desktop-client";
import { getAppStore } from "../../shared/app-store";
import { getDb } from "../../shared/db";
import { decryptToken } from "../../utils/encryption";
import * as logger from "../../shared/utils/logger";

const POST_TIMEOUT_MS = 10_000;

const findValidAccessToken = async (): Promise<AuthToken | null> => {
  const db = await getDb();
  const token = await db.authToken.findFirst({
    orderBy: { createdAt: "desc" },
  });

  if (!token) return null;

  const now = new Date();
  if (now > token.expiresAt) {
    await db.authToken.deleteMany({
      where: { expiresAt: { lte: now } },
    });
    return null;
  }

  return token;
};

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
    const store = await getAppStore();
    const managerUrl = store.get("managerUrl");
    if (!managerUrl) return false;

    const token = await findValidAccessToken();
    if (!token) return false;

    const accessToken = await decryptToken(token.accessToken);
    if (!accessToken) return false;

    const endpoint = `${managerUrl.replace(/\/$/, "")}/api/internal/audit-logs`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ logs: [buildRemoteLog(input)] }),
      signal: AbortSignal.timeout(POST_TIMEOUT_MS),
    });

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
