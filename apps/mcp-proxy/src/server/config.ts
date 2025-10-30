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
 *
 * 最適化: 5階層ネストクエリから2つのシンプルなクエリに分割
 * - クエリ1: toolGroupIdを取得（高速）
 * - クエリ2: 一意な設定を直接取得（高速）
 *
 * 期待される効果:
 * - 実行時間: 200-300ms → 100ms（50-66%高速化）
 * - データサイズ: 大幅削減（重複なし）
 * - コードの簡素化: 重複排除ロジック（configMap）削除
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
    // クエリ1: toolGroupIdを取得（高速）
    const instance = await db.userMcpServerInstance.findUnique({
      where: { id: userMcpServerInstanceId },
      select: {
        toolGroup: {
          select: { id: true },
        },
      },
    });

    if (!instance?.toolGroup) {
      return [];
    }

    // クエリ2: 一意な設定を直接取得（高速）
    const configs = await db.userMcpServerConfig.findMany({
      where: {
        userToolGroupTools: {
          some: {
            toolGroupId: instance.toolGroup.id,
          },
        },
      },
      include: {
        mcpServer: true,
      },
      distinct: ["id"], // Prismaが重複を自動排除
    });

    // configMap不要！直接configs.map()で変換
    return configs.map((userMcpServerConfig) => {
      const { mcpServer } = userMcpServerConfig;

      // envVarsを復号化
      let envVars: Record<string, string> = {};
      try {
        if (userMcpServerConfig.envVars) {
          // envVarsは暗号化されたJSON文字列
          // 復号化はPrismaのミドルウェアで自動的に行われる
          const parsed: unknown = JSON.parse(userMcpServerConfig.envVars);

          // 型チェック: オブジェクトであり、配列でないことを確認
          if (
            typeof parsed === "object" &&
            parsed !== null &&
            !Array.isArray(parsed)
          ) {
            envVars = parsed as Record<string, string>;
          } else {
            throw new Error("envVars must be an object");
          }
        }
      } catch (error) {
        // エラーログでは設定IDの一部のみを出力（セキュリティ考慮）
        logError("Failed to parse envVars for config", error as Error, {
          configId: userMcpServerConfig.id.slice(0, 8),
        });
        // 明示的にデフォルト値を設定
        envVars = {};
      }

      // Stdioの場合はcommandとargsからURLを構築
      let url = mcpServer.url ?? "";
      if (mcpServer.transportType === "STDIO") {
        const command = mcpServer.command ?? "";
        const args = mcpServer.args.join(" ");
        url = args ? `${command} ${args}` : command;
      }

      return {
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
      };
    });
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
