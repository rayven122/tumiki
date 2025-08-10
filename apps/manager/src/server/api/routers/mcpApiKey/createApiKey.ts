import "server-only";

import type { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "@tumiki/db/server";
import type { ProtectedContext } from "../../trpc";
import { generateApiKey } from "@/utils/server";
import type { CreateApiKeyInput } from "./schemas";

type CreateApiKeyProps = {
  ctx: ProtectedContext;
  input: z.infer<typeof CreateApiKeyInput>;
};

export const createApiKey = async ({ ctx, input }: CreateApiKeyProps) => {
  const { name, userMcpServerInstanceId, expiresInDays } = input;

  // 組織がこのMCPサーバーインスタンスの所有者かチェック
  const instance = await db.userMcpServerInstance.findFirst({
    where: {
      id: userMcpServerInstanceId,
      organizationId: ctx.currentOrganizationId,
    },
  });

  if (!instance) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "MCP Server Instance not found",
    });
  }

  const fullKey = generateApiKey();

  const expiresAt = expiresInDays
    ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
    : null;

  const apiKey = await db.mcpApiKey.create({
    data: {
      name,
      apiKey: fullKey,
      expiresAt,
      userMcpServerInstanceId,
    },
  });

  return {
    apiKey: {
      ...apiKey,
      apiKey: undefined, // セキュリティのため暗号化キーは返さない
    },
    secretKey: fullKey, // 初回のみ返す
  };
};
