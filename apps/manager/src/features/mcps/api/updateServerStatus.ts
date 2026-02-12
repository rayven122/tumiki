import type { PrismaTransactionClient } from "@tumiki/db";
import { ServerStatus } from "@tumiki/db/prisma";
import { z } from "zod";
import type { McpServerId } from "@/schema/ids";
import { createManyNotifications } from "@/features/notification";

type UpdateServerStatusInput = {
  id: McpServerId;
  isEnabled: boolean;
  organizationId: string;
  organizationSlug: string;
};

// サーバーステータス更新のレスポンススキーマ
export const updateServerStatusOutputSchema = z.object({
  id: z.string(),
  serverStatus: z.enum(["RUNNING", "STOPPED", "ERROR", "PENDING"]),
});

export type UpdateServerStatusOutput = z.infer<
  typeof updateServerStatusOutputSchema
>;

export const updateServerStatus = async (
  tx: PrismaTransactionClient,
  input: UpdateServerStatusInput,
  userId: string,
): Promise<UpdateServerStatusOutput> => {
  const { id, isEnabled, organizationId, organizationSlug } = input;

  // サーバーの存在確認
  const server = await tx.mcpServer.findUnique({
    where: {
      id,
      organizationId,
      deletedAt: null,
    },
  });

  if (!server) {
    throw new Error("サーバーが見つかりません");
  }

  // ステータスを更新
  const newStatus = isEnabled ? ServerStatus.RUNNING : ServerStatus.STOPPED;

  const updatedServer = await tx.mcpServer.update({
    where: {
      id,
    },
    data: {
      serverStatus: newStatus,
    },
  });

  // 組織の全メンバーに通知を作成
  const orgMembers = await tx.organizationMember.findMany({
    where: { organizationId },
    select: { userId: true },
  });

  const statusText = isEnabled ? "起動" : "停止";
  const priority = isEnabled ? "NORMAL" : "HIGH"; // 停止時は高優先度

  const notificationUserIds = orgMembers.map((member) => member.userId);

  await createManyNotifications(tx, notificationUserIds, {
    type: "MCP_SERVER_STATUS_CHANGED",
    priority,
    title: `MCPサーバーが${statusText}しました`,
    message: `「${updatedServer.name}」が${statusText}しました。`,
    linkUrl: `/${organizationSlug}/mcps/${server.slug}`,
    organizationId,
    triggeredById: userId,
  });

  return {
    id: updatedServer.id,
    serverStatus: updatedServer.serverStatus,
  };
};
