import type { PrismaTransactionClient } from "@tumiki/db";
import { ServerType } from "@tumiki/db/prisma";
import { z } from "zod";
import type { McpServerId } from "@/schema/ids";

type FindByIdInput = {
  id: McpServerId;
  organizationId: string;
};

// サーバー詳細のレスポンススキーマ
export const findByIdOutputSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  iconPath: z.string().nullable(),
  serverStatus: z.enum(["RUNNING", "STOPPED", "ERROR", "PENDING"]),
  serverType: z.enum(["OFFICIAL", "CUSTOM"]),
  authType: z.enum(["NONE", "API_KEY", "OAUTH"]),
  mcpServerTemplateId: z.string().nullable(),
  tools: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      description: z.string(),
      inputSchema: z.unknown(),
      isEnabled: z.boolean(),
    }),
  ),
  mcpServer: z
    .object({
      id: z.string(),
      name: z.string(),
      description: z.string().nullable(),
      tags: z.array(z.string()),
      iconPath: z.string().nullable(),
      url: z.string().nullable(),
      authType: z.enum(["NONE", "API_KEY", "OAUTH"]),
    })
    .nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type FindByIdOutput = z.infer<typeof findByIdOutputSchema>;

export const findById = async (
  tx: PrismaTransactionClient,
  input: FindByIdInput,
): Promise<FindByIdOutput> => {
  const { id, organizationId } = input;

  const server = await tx.mcpServer.findUnique({
    where: {
      id,
      organizationId,
      deletedAt: null,
    },
    include: {
      allowedTools: {
        select: {
          id: true,
          name: true,
          description: true,
          inputSchema: true,
        },
      },
      mcpServers: {
        select: {
          id: true,
          name: true,
          description: true,
          tags: true,
          iconPath: true,
          url: true,
          authType: true,
        },
        take: 1,
      },
    },
  });

  if (!server || server.deletedAt !== null) {
    throw new Error("サーバーが見つかりません");
  }

  const mcpServerTemplate = server.mcpServers?.[0];

  return {
    id: server.id,
    name: server.name,
    description: server.description,
    iconPath: server.iconPath,
    serverStatus: server.serverStatus,
    serverType: server.serverType,
    authType: server.authType,
    mcpServerTemplateId: mcpServerTemplate?.id ?? null,
    tools: server.allowedTools.map((tool) => ({
      ...tool,
      isEnabled: true, // allowedToolsに含まれているツールは全て有効
    })),
    mcpServer: mcpServerTemplate ?? null,
    createdAt: server.createdAt,
    updatedAt: server.updatedAt,
  };
};
