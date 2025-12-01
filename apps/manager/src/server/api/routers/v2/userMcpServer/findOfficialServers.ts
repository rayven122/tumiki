import type { PrismaTransactionClient } from "@tumiki/db";
import { ServerType } from "@tumiki/db/prisma";
import { z } from "zod";

type FindOfficialServersInput = {
  organizationId: string;
  userId: string;
};

// McpServerのIDスキーマ（McpServerテーブルのid）
const McpServerIdSchema = z.string().brand<"McpServerId">();

// OAuth トークン状態のスキーマ
const oauthTokenStatusSchema = z.object({
  hasToken: z.boolean(),
  isExpired: z.boolean(),
  isExpiringSoon: z.boolean(),
  expiresAt: z.date().nullable(),
  daysRemaining: z.number().nullable(),
});

// 公式サーバー一覧のレスポンススキーマ
export const findOfficialServersOutputSchema = z.array(
  z.object({
    id: McpServerIdSchema,
    name: z.string(),
    description: z.string(),
    iconPath: z.string().nullable(),
    serverStatus: z.enum(["RUNNING", "STOPPED", "ERROR", "PENDING"]),
    serverType: z.enum(["OFFICIAL", "CUSTOM"]),
    tools: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        description: z.string(),
        inputSchema: z.unknown(),
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
    apiKeys: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        createdAt: z.date(),
        updatedAt: z.date(),
        mcpServerId: z.string(),
        expiresAt: z.date().nullable(),
        userId: z.string(),
        deletedAt: z.date().nullable(),
        apiKeyHash: z.string().nullable(),
        isActive: z.boolean(),
        lastUsedAt: z.date().nullable(),
        scopes: z.array(z.string()),
      }),
    ),
    oauthTokenStatus: oauthTokenStatusSchema.nullable(),
  }),
);

export type FindOfficialServersOutput = z.infer<
  typeof findOfficialServersOutputSchema
>;

/**
 * OAuth トークンを一括取得してマップ化する
 */
const fetchOAuthTokensMap = async (
  tx: PrismaTransactionClient,
  userId: string,
  mcpServerTemplateIds: string[],
): Promise<Map<string, { accessTokenExpiresAt: Date | null }>> => {
  const oauthTokens = await tx.mcpOAuthToken.findMany({
    where: {
      userId,
      oauthClient: {
        mcpServerTemplateId: {
          in: mcpServerTemplateIds,
        },
      },
    },
    select: {
      expiresAt: true,
      oauthClient: {
        select: {
          mcpServerTemplateId: true,
        },
      },
    },
  });

  // mcpServerTemplateId ごとにトークン情報をマップ化
  const tokenMap = new Map<string, { accessTokenExpiresAt: Date | null }>();
  for (const token of oauthTokens) {
    if (token.oauthClient.mcpServerTemplateId) {
      tokenMap.set(token.oauthClient.mcpServerTemplateId, {
        accessTokenExpiresAt: token.expiresAt,
      });
    }
  }

  return tokenMap;
};

export const findOfficialServers = async (
  tx: PrismaTransactionClient,
  input: FindOfficialServersInput,
): Promise<FindOfficialServersOutput> => {
  const { organizationId, userId } = input;

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
      apiKeys: {
        where: {
          isActive: true,
          deletedAt: null,
        },
      },
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

  // OAuth トークン状態を一括取得
  const mcpServerTemplateIds = officialServers
    .map((server) => server.mcpServers?.[0]?.id)
    .filter((id): id is string => id !== undefined);

  const tokenMap = await fetchOAuthTokensMap(tx, userId, mcpServerTemplateIds);

  return officialServers.map((server) => {
    const mcpServerTemplate = server.mcpServers?.[0];

    // OAuth トークン状態を計算
    let oauthTokenStatus = null;
    if (mcpServerTemplate?.authType === "OAUTH") {
      const tokenInfo = tokenMap.get(mcpServerTemplate.id);
      // トークンの有無のみを返す
      // リフレッシュトークンの有効期限は不明なため、期限関連の情報は全て null
      oauthTokenStatus = {
        hasToken: !!tokenInfo,
        isExpired: false,
        isExpiringSoon: false,
        expiresAt: null,
        daysRemaining: null,
      };
    }

    return {
      id: server.id as z.infer<typeof McpServerIdSchema>,
      name: server.name,
      description: server.description,
      iconPath: server.iconPath,
      serverStatus: server.serverStatus,
      serverType: server.serverType,
      tools: server.allowedTools,
      mcpServer: mcpServerTemplate ?? null,
      apiKeys: server.apiKeys,
      oauthTokenStatus,
    };
  });
};
