/**
 * MCPサーバーセットアップ関連のヘルパー関数
 */
import type { PrismaTransactionClient } from "@tumiki/db";
import { ServerStatus, TransportType } from "@tumiki/db/prisma";
import { TRPCError } from "@trpc/server";
import {
  getMcpServerToolsHTTP,
  getMcpServerToolsSSE,
} from "@/features/mcps/utils/getMcpServerTools";

/**
 * MCPサーバーからツールを取得してセットアップ
 *
 * 差分更新ロジック:
 * - 新規ツール: create して connect
 * - 既存ツール: update して connect（既存接続の場合はスキップ）
 * - 削除されたツール: disconnect（他のインスタンスから参照されていない場合は削除）
 *
 * 重複ツール問題を避けるため、set() ではなく connect/disconnect を使用
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
      message: `MCPサーバーからツールを取得できませんでした。サーバー: ${mcpServerName} (${mcpServerTemplateUrl})、トランスポート: ${transportType}。詳細はサーバーログを確認してください。`,
    });
  }

  // MCPサーバーの情報を取得（テンプレートIDと既存ツールを含む）
  const mcpServer = await tx.mcpServer.findUnique({
    where: { id: mcpServerId },
    select: {
      templateInstances: {
        take: 1,
        select: {
          id: true,
          mcpServerTemplate: {
            select: {
              id: true,
              mcpTools: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          allowedTools: {
            select: { id: true },
          },
        },
      },
    },
  });

  if (!mcpServer?.templateInstances[0]) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "MCPサーバーテンプレートが見つかりません",
    });
  }

  const templateInstance = mcpServer.templateInstances[0];
  const mcpServerTemplateId = templateInstance.mcpServerTemplate.id;
  const existingTools = templateInstance.mcpServerTemplate.mcpTools;
  const existingAllowedToolIds = new Set(
    templateInstance.allowedTools.map((t) => t.id),
  );

  const newToolNames = new Set(tools.map((t) => t.name));

  // ツールをupsertで作成・更新（既存のツールは更新、新規ツールは作成）
  const upsertedTools = await Promise.all(
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

  // 差分計算: connect するツール（allowedTools にないもの）
  const upsertedToolIds = new Set(upsertedTools.map((t) => t.id));
  const toConnectIds = [...upsertedToolIds].filter(
    (id) => !existingAllowedToolIds.has(id),
  );

  // 差分計算: disconnect するツール（新しいツール一覧にないもの）
  const toDisconnectIds = existingTools
    .filter((t) => !newToolNames.has(t.name))
    .map((t) => t.id)
    .filter((id) => existingAllowedToolIds.has(id));

  // 差分更新を実行（set ではなく connect/disconnect を使用）
  if (toConnectIds.length > 0 || toDisconnectIds.length > 0) {
    await tx.mcpServerTemplateInstance.update({
      where: { id: templateInstance.id },
      data: {
        allowedTools: {
          ...(toConnectIds.length > 0 && {
            connect: toConnectIds.map((id) => ({ id })),
          }),
          ...(toDisconnectIds.length > 0 && {
            disconnect: toDisconnectIds.map((id) => ({ id })),
          }),
        },
      },
    });
  }

  // どのインスタンスからも参照されなくなったツールを削除
  if (toDisconnectIds.length > 0) {
    await tx.mcpTool.deleteMany({
      where: {
        id: { in: toDisconnectIds },
        templateInstances: { none: {} },
      },
    });
  }

  await tx.mcpServer.update({
    where: { id: mcpServerId },
    data: {
      serverStatus: ServerStatus.RUNNING,
    },
  });

  return upsertedTools.length;
};
