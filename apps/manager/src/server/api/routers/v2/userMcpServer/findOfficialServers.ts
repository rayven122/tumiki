import type { PrismaTransactionClient } from "@tumiki/db";
import { ServerType } from "@tumiki/db/prisma";
import { z } from "zod";

type FindOfficialServersInput = {
  organizationId: string;
};

// McpServerのIDスキーマ（McpServerテーブルのid）
const McpServerIdSchema = z.string().brand<"McpServerId">();

// 公式サーバー一覧のレスポンススキーマ
export const findOfficialServersOutputSchema = z.array(
  z.object({
    id: McpServerIdSchema,
    name: z.string(),
    description: z.string(),
    iconPath: z.string().nullable(),
    serverStatus: z.enum(["RUNNING", "STOPPED", "ERROR", "PENDING"]),
    serverType: z.enum(["OFFICIAL", "CUSTOM"]),
    tools: z.array(z.object({})),
    mcpServer: z
      .object({
        id: z.string(),
        name: z.string(),
        description: z.string().nullable(),
        tags: z.array(z.string()),
        iconPath: z.string().nullable(),
        url: z.string().nullable(),
      })
      .nullable(),
    apiKeys: z.array(
      z.object({
        id: z.string(),
        apiKey: z.string(),
        createdAt: z.date(),
        updatedAt: z.date(),
        mcpServerId: z.string(),
      }),
    ),
  }),
);

export type FindOfficialServersOutput = z.infer<
  typeof findOfficialServersOutputSchema
>;

export const findOfficialServers = async (
  tx: PrismaTransactionClient,
  input: FindOfficialServersInput,
): Promise<FindOfficialServersOutput> => {
  const { organizationId } = input;

  const officialServers = await tx.mcpServer.findMany({
    where: {
      serverType: ServerType.OFFICIAL,
      organizationId,
      deletedAt: null,
    },
    orderBy: {
      displayOrder: "asc",
    },
    include: {
      apiKeys: true,
      allowedTools: {
        take: 10, // とりあえず最初の10件を取得
      },
      mcpServers: {
        select: {
          id: true,
          name: true,
          description: true,
          tags: true,
          iconPath: true,
          url: true,
        },
        take: 1,
      },
    },
  });

  return officialServers.map((server) => {
    const toolCount = server.allowedTools?.length ?? 0;
    const mcpServerTemplate = server.mcpServers?.[0];

    return {
      id: server.id as z.infer<typeof McpServerIdSchema>,
      name: server.name,
      description: server.description,
      iconPath: server.iconPath,
      serverStatus: server.serverStatus,
      serverType: server.serverType,
      tools: Array(toolCount).fill({}) as Record<string, never>[],
      mcpServer: mcpServerTemplate ?? null,
      apiKeys: server.apiKeys,
    };
  });
};
