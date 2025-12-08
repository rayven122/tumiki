import { ServerType, TransportType } from "@tumiki/db";
import { db } from "@tumiki/db/server";

/**
 * スキャン対象のMCPサーバーを取得
 * 新しいDBスキーマに対応:
 * - McpServer (実稼働サーバー)
 * - templateInstances (McpServerTemplateInstance へのリレーション)
 * - McpConfig (環境変数)
 */
export const fetchScannableServers = async () => {
  // 実稼働中のOFFICIALサーバーを取得
  const servers = await db.mcpServer.findMany({
    where: {
      serverType: ServerType.OFFICIAL,
      deletedAt: null,
    },
    include: {
      organization: true,
      templateInstances: {
        include: {
          mcpServerTemplate: {
            include: {
              mcpConfigs: {
                include: {
                  organization: true,
                },
              },
            },
          },
        },
      },
    },
  });

  // SSEまたはSTREAMABLE_HTTPSのテンプレートのみをフィルタリング
  return servers.map((server) => ({
    ...server,
    templateInstances: server.templateInstances.filter(
      (instance) =>
        instance.mcpServerTemplate.transportType === TransportType.SSE ||
        instance.mcpServerTemplate.transportType ===
          TransportType.STREAMABLE_HTTPS,
    ),
  }));
};

/**
 * MCPConfigから環境変数を取得してパースする
 */
export const parseEnvVars = (
  envVarsJson: string | null,
): Record<string, string> => {
  if (!envVarsJson) {
    return {};
  }

  try {
    const parsed = JSON.parse(envVarsJson) as Record<string, string>;
    return parsed;
  } catch {
    console.warn("環境変数のパースに失敗しました");
    return {};
  }
};
