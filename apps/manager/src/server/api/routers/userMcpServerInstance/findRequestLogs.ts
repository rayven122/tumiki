import { type ProtectedContext } from "@/server/api/trpc";
import { db } from "@tumiki/db/tcp";
import { RequestLogOutput, type FindRequestLogsInput } from "./index";
import { z } from "zod";

export const findRequestLogs = async ({
  input,
  ctx,
}: {
  input: z.infer<typeof FindRequestLogsInput>;
  ctx: ProtectedContext;
}) => {
  // 組織がそのインスタンスにアクセス権を持っているかチェック
  const instance = await db.userMcpServerInstance.findFirst({
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
      mcpServerInstanceId: input.instanceId,
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
