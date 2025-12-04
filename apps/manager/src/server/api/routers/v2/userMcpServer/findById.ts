import type { PrismaTransactionClient } from "@tumiki/db";
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
        },
      },
      mcpServers: {
        take: 1,
        include: {
          mcpTools: {
            select: {
              id: true,
              name: true,
              description: true,
              inputSchema: true,
            },
          },
        },
      },
    },
  });

  if (!server || server.deletedAt !== null) {
    throw new Error("サーバーが見つかりません");
  }

  const mcpServerTemplate = server.mcpServers?.[0];
  const allowedToolIds = new Set(server.allowedTools.map((tool) => tool.id));

  // MCPテンプレートの全ツールを取得し、allowedToolsに含まれているかをisEnabledで示す
  const allTools = mcpServerTemplate?.mcpTools ?? [];

  return {
    id: server.id,
    name: server.name,
    description: server.description,
    iconPath: server.iconPath,
    serverStatus: server.serverStatus,
    serverType: server.serverType,
    authType: server.authType,
    mcpServerTemplateId: mcpServerTemplate?.id ?? null,
    tools: allTools.map((tool) => ({
      ...tool,
      isEnabled: allowedToolIds.has(tool.id),
    })),
    mcpServer: mcpServerTemplate
      ? {
          id: mcpServerTemplate.id,
          name: mcpServerTemplate.name,
          description: mcpServerTemplate.description,
          tags: mcpServerTemplate.tags,
          iconPath: mcpServerTemplate.iconPath,
          url: mcpServerTemplate.url,
          authType: mcpServerTemplate.authType,
        }
      : null,
    createdAt: server.createdAt,
    updatedAt: server.updatedAt,
  };
};
