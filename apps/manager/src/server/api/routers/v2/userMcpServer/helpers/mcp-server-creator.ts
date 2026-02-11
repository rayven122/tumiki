/**
 * MCPサーバー作成のヘルパー関数
 */
import type { PrismaTransactionClient } from "@tumiki/db";
import { ServerStatus, ServerType, AuthType } from "@tumiki/db/server";

type CreateOfficialMcpServerParams = {
  tx: PrismaTransactionClient;
  serverName: string;
  slug: string;
  description: string;
  templateId: string;
  organizationId: string;
  normalizedName: string;
  iconPath: string | null;
};

/**
 * 公式MCPサーバーを作成（ServerType.OFFICIAL）
 */
export const createOfficialMcpServer = async (
  params: CreateOfficialMcpServerParams,
): Promise<{ id: string; templateInstanceId: string }> => {
  const {
    tx,
    serverName,
    slug,
    description,
    templateId,
    organizationId,
    normalizedName,
    iconPath,
  } = params;

  const mcpServer = await tx.mcpServer.create({
    data: {
      name: serverName,
      slug,
      description,
      iconPath,
      serverStatus: ServerStatus.PENDING,
      serverType: ServerType.OFFICIAL,
      authType: AuthType.OAUTH,
      organizationId,
      templateInstances: {
        create: {
          mcpServerTemplateId: templateId,
          normalizedName,
          isEnabled: true,
          displayOrder: 0,
        },
      },
    },
    include: {
      templateInstances: {
        select: {
          id: true,
        },
      },
    },
  });

  const templateInstanceId = mcpServer.templateInstances[0]?.id;
  if (!templateInstanceId) {
    throw new Error("Template instance was not created");
  }

  return { id: mcpServer.id, templateInstanceId };
};
