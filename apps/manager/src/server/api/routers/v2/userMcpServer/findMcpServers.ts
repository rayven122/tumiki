import type { PrismaTransactionClient } from "@tumiki/db";
import { ServerStatus } from "@tumiki/db/prisma";

type FindMcpServersInput = {
  organizationId: string;
  userId: string;
};

/** 日付配列から最小値を取得 */
const getMinDate = (dates: Date[]): Date | null =>
  dates.length > 0
    ? new Date(Math.min(...dates.map((d) => d.getTime())))
    : null;

export const findMcpServers = async (
  tx: PrismaTransactionClient,
  input: FindMcpServersInput,
) => {
  const { organizationId, userId } = input;

  const [userOAuthTokens, servers] = await Promise.all([
    tx.mcpOAuthToken.findMany({
      where: { userId, organizationId },
      select: { mcpServerTemplateInstanceId: true, expiresAt: true },
    }),
    tx.mcpServer.findMany({
      where: {
        organizationId,
        deletedAt: null,
        serverStatus: { not: ServerStatus.PENDING },
      },
      orderBy: { displayOrder: "asc" },
      include: {
        apiKeys: {
          where: { isActive: true, deletedAt: null },
          select: {
            id: true,
            name: true,
            isActive: true,
            expiresAt: true,
            createdAt: true,
          },
        },
        createdBy: {
          select: { id: true, name: true },
        },
        templateInstances: {
          orderBy: [{ displayOrder: "asc" }, { updatedAt: "asc" }],
          include: {
            mcpServerTemplate: { include: { mcpTools: true } },
            allowedTools: { select: { id: true } },
          },
        },
      },
    }),
  ]);

  // 各サーバーの最終使用日時をRequestLogから取得
  const serverIds = servers.map((s) => s.id);
  const lastUsedLogs = await tx.mcpServerRequestLog.groupBy({
    by: ["mcpServerId"],
    where: { mcpServerId: { in: serverIds } },
    _max: { createdAt: true },
  });
  const lastUsedByServerId = new Map(
    lastUsedLogs.map((log) => [log.mcpServerId, log._max.createdAt]),
  );

  const tokensByInstanceId = new Map(
    userOAuthTokens.map((t) => [
      t.mcpServerTemplateInstanceId,
      { expiresAt: t.expiresAt },
    ]),
  );

  const authenticatedInstanceIds = new Set(
    userOAuthTokens.map((t) => t.mcpServerTemplateInstanceId),
  );

  return servers.map((server) => {
    const templateInstances = server.templateInstances.map((instance) => {
      const allowedToolIds = new Set(
        instance.allowedTools.map((tool) => tool.id),
      );
      const tools = instance.mcpServerTemplate.mcpTools.map((tool) => ({
        id: tool.id,
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
        mcpServerTemplateId: tool.mcpServerTemplateId,
        createdAt: tool.createdAt,
        updatedAt: tool.updatedAt,
        isEnabled: allowedToolIds.has(tool.id),
      }));

      const isOAuthRequired = instance.mcpServerTemplate.authType === "OAUTH";
      const isOAuthAuthenticated = isOAuthRequired
        ? authenticatedInstanceIds.has(instance.id)
        : null;

      const tokenInfo = tokensByInstanceId.get(instance.id);
      const oauthTokenExpiresAt = isOAuthRequired
        ? (tokenInfo?.expiresAt ?? null)
        : null;

      // mcpToolsは出力スキーマに含まれないため除外
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { mcpTools, ...mcpServerTemplate } = instance.mcpServerTemplate;

      return {
        id: instance.id,
        normalizedName: instance.normalizedName,
        mcpServerId: instance.mcpServerId,
        mcpServerTemplateId: instance.mcpServerTemplateId,
        isEnabled: instance.isEnabled,
        displayOrder: instance.displayOrder,
        createdAt: instance.createdAt,
        updatedAt: instance.updatedAt,
        mcpServerTemplate,
        tools,
        isOAuthAuthenticated,
        oauthTokenExpiresAt,
      };
    });

    // サーバー全体のOAuth状態
    const oauthInstances = templateInstances.filter(
      (i) => i.isOAuthAuthenticated !== null,
    );
    const allOAuthAuthenticated =
      oauthInstances.length > 0
        ? oauthInstances.every((i) => i.isOAuthAuthenticated === true)
        : null;

    // 最も早く期限切れになるOAuthトークンの有効期限を取得
    const oauthExpirations = templateInstances
      .map((i) => i.oauthTokenExpiresAt)
      .filter((date): date is Date => date !== null);
    const earliestOAuthExpiration = getMinDate(oauthExpirations);

    // 最終使用日時（RequestLogから取得）
    const lastUsedAt = lastUsedByServerId.get(server.id) ?? null;

    return {
      id: server.id,
      serverStatus: server.serverStatus,
      serverType: server.serverType,
      authType: server.authType,
      piiMaskingMode: server.piiMaskingMode,
      name: server.name,
      slug: server.slug,
      description: server.description,
      iconPath: server.iconPath,
      organizationId: server.organizationId,
      createdById: server.createdById,
      displayOrder: server.displayOrder,
      piiInfoTypes: server.piiInfoTypes,
      toonConversionEnabled: server.toonConversionEnabled,
      dynamicSearch: server.dynamicSearch,
      createdAt: server.createdAt,
      updatedAt: server.updatedAt,
      deletedAt: server.deletedAt,
      apiKeys: server.apiKeys,
      templateInstances,
      allOAuthAuthenticated,
      earliestOAuthExpiration,
      lastUsedAt,
      createdBy: server.createdBy,
    };
  });
};
