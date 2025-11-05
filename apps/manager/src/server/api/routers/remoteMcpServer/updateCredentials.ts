/**
 * 認証情報更新
 */

import { type z } from "zod";
import { type ProtectedContext } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { type UpdateCredentialsInput } from ".";

type UpdateCredentialsProps = {
  ctx: ProtectedContext;
  input: z.infer<typeof UpdateCredentialsInput>;
};

export const updateCredentials = async ({
  ctx,
  input,
}: UpdateCredentialsProps) => {
  const { db } = ctx;
  const currentOrganizationId = ctx.currentOrganizationId;

  // UserMcpServerConfigを取得
  const userMcpConfig = await db.userMcpServerConfig.findUnique({
    where: { id: input.userMcpConfigId },
    include: {
      mcpServer: true,
    },
  });

  if (!userMcpConfig) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "User MCP server configuration not found",
    });
  }

  // 組織の確認
  if (userMcpConfig.organizationId !== currentOrganizationId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have permission to update this configuration",
    });
  }

  // OAuth認証の場合はエラー（OAuth tokenは別の方法で更新）
  if (userMcpConfig.mcpServer.authType === "OAUTH") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "Cannot update credentials for OAuth-based MCP server. Use OAuth flow instead.",
    });
  }

  // 認証情報を更新
  const envVarsJson = JSON.stringify(input.credentials.envVars ?? {});

  const updated = await db.userMcpServerConfig.update({
    where: { id: input.userMcpConfigId },
    data: {
      envVars: envVarsJson,
    },
  });

  return {
    success: true,
    userMcpConfigId: updated.id,
  };
};
