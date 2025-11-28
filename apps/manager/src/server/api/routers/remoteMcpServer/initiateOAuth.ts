/**
 * OAuth認証開始
 */

import { type z } from "zod";
import { type ProtectedContext } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { type InitiateOAuthInput } from ".";

type InitiateOAuthProps = {
  ctx: ProtectedContext;
  input: z.infer<typeof InitiateOAuthInput>;
};

export const initiateOAuth = async ({ ctx, input }: InitiateOAuthProps) => {
  const { db } = ctx;

  // MCPサーバーの確認
  const mcpServer = await db.mcpServer.findUnique({
    where: { id: input.mcpServerId },
    include: { oauthClient: true },
  });

  if (!mcpServer) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "MCP server not found",
    });
  }

  if (mcpServer.authType !== "OAUTH") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "This MCP server does not support OAuth authentication",
    });
  }

  // UserMcpServerConfigの確認
  const userMcpConfig = await db.userMcpServerConfig.findUnique({
    where: { id: input.userMcpConfigId },
  });

  if (!userMcpConfig) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "User MCP server configuration not found",
    });
  }

  // /api/oauth/authorize を呼び出すための情報を返す
  // フロントエンドでPOSTリクエストを送信してもらう
  return {
    mcpServerId: input.mcpServerId,
    userMcpConfigId: input.userMcpConfigId,
    scopes: input.scopes ?? mcpServer.oauthScopes,
    // フロントエンドで /api/oauth/authorize にPOSTする
    authorizeEndpoint: "/api/oauth/authorize",
  };
};
