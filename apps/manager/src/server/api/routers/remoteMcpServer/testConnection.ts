/**
 * 接続テスト
 */

import { type z } from "zod";
import { type ProtectedContext } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { type TestConnectionInput } from ".";
import { getMcpServerToolsSSE } from "@/utils/getMcpServerTools";

type TestConnectionProps = {
  ctx: ProtectedContext;
  input: z.infer<typeof TestConnectionInput>;
};

export const testConnection = async ({ ctx, input }: TestConnectionProps) => {
  const { db } = ctx;
  const currentOrganizationId = ctx.currentOrganizationId;

  // UserMcpServerConfigを取得
  const userMcpConfig = await db.userMcpServerConfig.findUnique({
    where: { id: input.userMcpConfigId },
    select: {
      id: true,
      name: true,
      description: true,
      envVars: true, // 明示的に含める（デフォルトでomitされているため）
      organizationId: true,
      mcpServer: {
        select: {
          id: true,
          name: true,
          url: true,
          authType: true,
        },
      },
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
      message: "You do not have permission to test this connection",
    });
  }

  try {
    // 環境変数を取得
    const envVars = JSON.parse(userMcpConfig.envVars) as Record<string, string>;

    // MCPサーバーのツールリストを取得して接続テスト
    const tools = await getMcpServerToolsSSE(
      {
        name: userMcpConfig.mcpServer.name,
        url: userMcpConfig.mcpServer.url,
      },
      envVars,
    );

    return {
      success: true,
      toolCount: tools.length,
      tools: tools.slice(0, 10).map((tool) => ({
        name: tool.name,
        description: tool.description,
      })),
      message: `Successfully connected to ${userMcpConfig.mcpServer.name}`,
    };
  } catch (error) {
    console.error("[Test Connection Error]", error);

    return {
      success: false,
      toolCount: 0,
      tools: [],
      error: error instanceof Error ? error.message : "Unknown error",
      message: `Failed to connect to ${userMcpConfig.mcpServer.name}`,
    };
  }
};
