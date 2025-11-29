/**
 * MCPサーバーセットアップ関連のヘルパー関数
 */
import type { PrismaTransactionClient } from "@tumiki/db";
import { ServerStatus, TransportType } from "@tumiki/db/prisma";
import { TRPCError } from "@trpc/server";
import {
  getMcpServerToolsHTTP,
  getMcpServerToolsSSE,
} from "@/utils/getMcpServerTools";

/**
 * MCPサーバーからツールを取得してセットアップ
 */
export const setupMcpServerTools = async (
  tx: PrismaTransactionClient,
  params: {
    mcpServerId: string;
    mcpServerName: string;
    mcpServerTemplateUrl: string;
    accessToken: string;
    transportType: TransportType;
  },
): Promise<number> => {
  const {
    mcpServerId,
    mcpServerName,
    mcpServerTemplateUrl,
    accessToken,
    transportType,
  } = params;

  // Authorizationヘッダーを準備
  const headers = {
    Authorization: `Bearer ${accessToken}`,
  };

  // MCPサーバーからツールを取得（トランスポートタイプに応じて関数を使い分け）
  const tools =
    transportType === TransportType.SSE
      ? await getMcpServerToolsSSE(
          {
            name: mcpServerName,
            url: mcpServerTemplateUrl,
          },
          headers,
        )
      : await getMcpServerToolsHTTP(
          {
            name: mcpServerName,
            url: mcpServerTemplateUrl,
          },
          headers,
        );

  if (!tools || tools.length === 0) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "MCPサーバーからツールを取得できませんでした",
    });
  }

  // MCPサーバーの情報を取得（テンプレートIDを確認）
  const mcpServer = await tx.mcpServer.findUnique({
    where: { id: mcpServerId },
    select: {
      mcpServers: {
        select: { id: true },
      },
    },
  });

  if (!mcpServer || mcpServer.mcpServers.length === 0) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "MCPサーバーテンプレートが見つかりません",
    });
  }

  const mcpServerTemplateId = mcpServer.mcpServers[0]!.id;

  // 既存のツールを削除（再取得のため）
  await tx.mcpTool.deleteMany({
    where: { mcpServerTemplateId },
  });

  // ツールをupsertで作成・更新
  const createdTools = await Promise.all(
    tools.map((tool) =>
      tx.mcpTool.upsert({
        where: {
          mcpServerTemplateId_name: {
            mcpServerTemplateId,
            name: tool.name,
          },
        },
        create: {
          mcpServerTemplateId,
          name: tool.name,
          description: tool.description ?? "",
          inputSchema: tool.inputSchema as object,
        },
        update: {
          description: tool.description ?? "",
          inputSchema: tool.inputSchema as object,
        },
      }),
    ),
  );

  // McpServer.allowedToolsに全てのツールを紐づけ、ステータスを更新
  await tx.mcpServer.update({
    where: { id: mcpServerId },
    data: {
      allowedTools: {
        set: createdTools.map((tool) => ({ id: tool.id })),
      },
      serverStatus: ServerStatus.RUNNING,
    },
  });

  return createdTools.length;
};
