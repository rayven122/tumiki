import { type ProtectedContext } from "@/server/api/trpc";
import { db } from "@tumiki/db/tcp";
import { RequestLogOutput, type FindRequestLogsInput } from "./index";
import { z } from "zod";

/**
 * 新スキーマ：リクエストログ取得
 * - userMcpServerInstance → mcpServer
 */
export const findRequestLogs = async ({
  input,
  ctx,
}: {
  input: z.infer<typeof FindRequestLogsInput>;
  ctx: ProtectedContext;
}) => {
  // 組織がそのインスタンスにアクセス権を持っているかチェック
  const instance = await db.mcpServer.findFirst({
    where: {
      id: input.instanceId,
      organizationId: ctx.currentOrganizationId,
      deletedAt: null,
    },
  });

  if (!instance) {
    throw new Error("アクセス権限がありません");
  }

  const logs = await db.mcpServerRequestLog.findMany({
    where: {
      mcpServerId: input.instanceId,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: input.limit ?? 20,
    skip: input.offset ?? 0,
  });

  // Zodでパースして型安全性を確保
  return z.array(RequestLogOutput).parse(logs);
};
