/**
 * MCPサーバー作成のヘルパー関数
 */
import type { PrismaTransactionClient } from "@tumiki/db";
import { ServerStatus, ServerType, AuthType } from "@tumiki/db/server";

type CreateMcpServerParams = {
  tx: PrismaTransactionClient;
  serverName: string;
  description: string;
  templateId: string;
  organizationId: string;
};

/**
 * MCPサーバーを作成
 */
export const createMcpServer = async (
  params: CreateMcpServerParams,
): Promise<{ id: string }> => {
  const { tx, serverName, description, templateId, organizationId } = params;

  const mcpServer = await tx.mcpServer.create({
    data: {
      name: serverName,
      description,
      iconPath: null,
      serverStatus: ServerStatus.PENDING,
      serverType: ServerType.OFFICIAL,
      authType: AuthType.API_KEY,
      organizationId,
      mcpServers: {
        connect: { id: templateId },
      },
    },
  });

  return { id: mcpServer.id };
};
