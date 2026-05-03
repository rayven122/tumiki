import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@tumiki/internal-db/server";
import { verifyDesktopJwt } from "~/lib/auth/verify-desktop-jwt";

const auditLogEntrySchema = z.object({
  sourceInstallationId: z.string().min(1).max(128),
  sourceAuditLogId: z.number().int().positive(),
  mcpServerId: z.string().min(1).max(64),
  toolName: z.string().min(1).max(255),
  method: z.string().min(1).max(64),
  httpStatus: z.number().int().min(100).max(599),
  durationMs: z.number().int().nonnegative(),
  inputBytes: z.number().int().nonnegative(),
  outputBytes: z.number().int().nonnegative(),
  errorCode: z.number().int().optional(),
  errorSummary: z.string().max(500).optional(),
  // Desktopで記録した実際のリクエスト発生時刻
  occurredAt: z.iso.datetime({ offset: true }),
});

const requestBodySchema = z.object({
  logs: z.array(auditLogEntrySchema).min(1).max(100),
});

// Desktop監査ログ一括受信エンドポイント。Bearer JWTで認証する。
export const POST = async (request: NextRequest) => {
  let verifiedUser: Awaited<ReturnType<typeof verifyDesktopJwt>>;
  try {
    verifiedUser = await verifyDesktopJwt(request.headers.get("Authorization"));
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = requestBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { logs } = parsed.data;

  let result: { count: number };
  try {
    result = await db.desktopAuditLog.createMany({
      data: logs.map((log) => ({
        sourceInstallationId: log.sourceInstallationId,
        sourceAuditLogId: log.sourceAuditLogId,
        userId: verifiedUser.userId,
        mcpServerId: log.mcpServerId,
        toolName: log.toolName,
        method: log.method,
        httpStatus: log.httpStatus,
        durationMs: log.durationMs,
        inputBytes: log.inputBytes,
        outputBytes: log.outputBytes,
        errorCode: log.errorCode,
        errorSummary: log.errorSummary,
        occurredAt: new Date(log.occurredAt),
      })),
      skipDuplicates: true,
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  return NextResponse.json({ inserted: result.count });
};

export const dynamic = "force-dynamic";
