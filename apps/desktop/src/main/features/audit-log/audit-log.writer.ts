import type { Prisma } from "@prisma/desktop-client";
import { getDb } from "../../shared/db";

/** 監査ログを1件書き込む */
export const writeAuditLog = async (
  input: Prisma.AuditLogUncheckedCreateInput,
): Promise<void> => {
  const db = await getDb();
  await db.auditLog.create({ data: input });
};

/** 指定日数より古い監査ログを削除（デフォルト: 7日） */
export const deleteOldAuditLogs = async (
  retentionDays: number = 7,
): Promise<number> => {
  const db = await getDb();
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  const result = await db.auditLog.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });
  return result.count;
};
