import { db } from "@tumiki/db/server";
import type { TransportType, AuthType } from "@tumiki/db";
import { logError } from "../libs/logger/index.js";
import { getCachedConfig } from "../libs/cache/configCache.js";

/**
 * Remote MCP サーバー設定型
 */
export type RemoteMcpServerConfig = {
  enabled: boolean;
  name: string;
  url: string;
  transportType?: "sse" | "http" | "stdio"; // SSE（デフォルト）、HTTP、Stdio
  authType: "none" | "bearer" | "api_key";
  authToken?: string;
  headers?: Record<string, string>;
  envVars?: Record<string, string>;
};

/**
 * TransportTypeをクライアント用トランスポートタイプに変換
 */
const mapTransportType = (
  dbTransportType: TransportType,
): "sse" | "http" | "stdio" => {
  switch (dbTransportType) {
    case "SSE":
      return "sse";
    case "STREAMABLE_HTTPS":
      return "http";
    case "STDIO":
      return "stdio";
    default:
      throw new Error(`Unknown transport type: ${String(dbTransportType)}`);
  }
};

/**
 * AuthTypeをクライアント用認証タイプに変換
 */
const mapAuthType = (dbAuthType: AuthType): "none" | "bearer" | "api_key" => {
  switch (dbAuthType) {
    case "NONE":
      return "none";
    case "API_KEY":
      return "api_key";
    case "OAUTH":
      return "bearer";
    default:
      throw new Error(`Unknown auth type: ${String(dbAuthType)}`);
  }
};

/**
 * UserMcpServerInstanceに対応するRemote MCPサーバー設定をDBから取得（内部関数）
 */
const _getEnabledServersForInstanceFromDB = async (
  userMcpServerInstanceId: string,
): Promise<
  Array<{
    namespace: string;
    config: RemoteMcpServerConfig;
  }>
> => {
  try {
    // UserMcpServerInstanceからToolGroupを取得
    const instance = await db.userMcpServerInstance.findUnique({
      where: { id: userMcpServerInstanceId },
      include: {
        toolGroup: {
          include: {
            toolGroupTools: {
              include: {
                userMcpServerConfig: {
                  include: {
                    mcpServer: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!instance || !instance.toolGroup) {
      return [];
    }

    // UserMcpServerConfigごとにグループ化してRemoteMcpServerConfigに変換
    const configMap = new Map<
      string,
      {
        namespace: string;
        config: RemoteMcpServerConfig;
      }
    >();

    for (const toolGroupTool of instance.toolGroup.toolGroupTools) {
      const { userMcpServerConfig } = toolGroupTool;
      const { mcpServer } = userMcpServerConfig;

      // 既に追加済みの場合はスキップ
      if (configMap.has(userMcpServerConfig.id)) {
        continue;
      }

      // envVarsを復号化
      let envVars: Record<string, string> = {};
      try {
        if (userMcpServerConfig.envVars) {
          // envVarsは暗号化されたJSON文字列
          // 復号化はPrismaのミドルウェアで自動的に行われる
          envVars = JSON.parse(userMcpServerConfig.envVars) as Record<
            string,
            string
          >;
        }
      } catch (error) {
        logError(
          `Failed to parse envVars for ${userMcpServerConfig.id}`,
          error as Error,
        );
      }

      // Stdioの場合はcommandとargsからURLを構築
      let url = mcpServer.url ?? "";
      if (mcpServer.transportType === "STDIO") {
        const command = mcpServer.command ?? "";
        const args = mcpServer.args.join(" ");
        url = args ? `${command} ${args}` : command;
      }

      configMap.set(userMcpServerConfig.id, {
        namespace: mcpServer.name.toLowerCase().replace(/\s+/g, "-"),
        config: {
          enabled: true,
          name: mcpServer.name,
          url,
          transportType: mapTransportType(mcpServer.transportType),
          authType: mapAuthType(mcpServer.authType),
          envVars,
          headers: {},
        },
      });
    }

    return Array.from(configMap.values());
  } catch (error) {
    logError(
      `Failed to get enabled servers for instance ${userMcpServerInstanceId}`,
      error as Error,
    );
    return [];
  }
};

/**
 * UserMcpServerInstanceに対応するRemote MCPサーバー設定を取得
 *
 * 開発環境モード:
 * - DEV_MODE=true の場合、固定のContext7 MCPサーバー設定を返す
 *
 * キャッシュ:
 * - Redis経由でキャッシュを使用（REDIS_URL環境変数が設定されている場合）
 * - キャッシュTTL: 300秒（CACHE_TTL環境変数でカスタマイズ可能）
 * - キャッシュミス時はDBから取得してキャッシュに保存
 *
 * @param userMcpServerInstanceId - UserMcpServerInstanceのID
 * @returns 有効なRemote MCPサーバーの配列
 */
export const getEnabledServersForInstance = async (
  userMcpServerInstanceId: string,
): Promise<
  Array<{
    namespace: string;
    config: RemoteMcpServerConfig;
  }>
> => {
  // 開発環境モード: 固定のContext7 MCPサーバー設定を返す
  if (process.env.DEV_MODE === "true") {
    return [
      {
        namespace: "context7",
        config: {
          enabled: true,
          name: "Context7 (Dev Mode)",
          url: "https://mcp.context7.com/mcp",
          transportType: "http",
          authType: "none",
          headers: {},
        },
      },
    ];
  }

  // キャッシュ経由でDB取得
  return await getCachedConfig(userMcpServerInstanceId, () =>
    _getEnabledServersForInstanceFromDB(userMcpServerInstanceId),
  );
};
