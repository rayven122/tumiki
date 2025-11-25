import { ServerType, TransportType } from "@tumiki/db";
import { db } from "@tumiki/db/server";

/**
 * スキャン対象のMCPサーバーを取得
 * 新しいDBスキーマに対応:
 * - McpServer (実稼働サーバー)
 * - mcpServers (McpServerTemplate へのリレーション)
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
      mcpServers: {
        where: {
          transportType: {
            in: [TransportType.SSE, TransportType.STREAMABLE_HTTPS],
          },
        },
        include: {
          mcpConfigs: {
            include: {
              organization: true,
            },
          },
        },
      },
    },
  });

  return servers;
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
