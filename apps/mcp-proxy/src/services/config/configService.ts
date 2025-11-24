import { db } from "@tumiki/db/server";
import { logError } from "../../libs/logger/index.js";
import { getCachedConfig } from "../../libs/cache/configCache.js";
import { injectAuthHeaders } from "../../libs/auth/oauth-header-injector.js";
import { mapTransportType, mapAuthType } from "./transformer.js";
import type { RemoteMcpServerConfig } from "../../types/index.js";

/**
 * McpServerに対応するRemote MCPサーバー設定をDBから取得（内部関数）
 *
 * 新しいスキーマ構造:
 * - McpServer → mcpServers (多対多) → McpServerTemplate
 * - McpConfig でユーザー/組織ごとの認証情報を管理
 *
 * 期待される効果:
 * - シンプルなクエリ構造
 * - McpServerTemplateの再利用
 * - 柔軟な設定管理
 */
const getEnabledServersForInstanceFromDB = async (
  mcpServerId: string,
  organizationId: string,
  userId?: string,
): Promise<
  Array<{
    namespace: string;
    config: RemoteMcpServerConfig;
  }>
> => {
  try {
    // McpServerとそのTemplateを取得
    const mcpServer = await db.mcpServer.findUnique({
      where: { id: mcpServerId },
      include: {
        mcpServerTemplates: true, // McpServerTemplate[]
      },
    });

    if (
      !mcpServer?.mcpServerTemplates ||
      mcpServer.mcpServerTemplates.length === 0
    ) {
      return [];
    }

    // 各Templateに対してConfigを取得し、設定を構築
    const configPromises = mcpServer.mcpServerTemplates.map(
      async (mcpServerTemplate) => {
        // McpConfigを取得（userId優先、なければorganizationId）
        const mcpConfig = await db.mcpConfig.findFirst({
          where: {
            mcpServerTemplateId: mcpServerTemplate.id,
            organizationId,
            OR: [...(userId ? [{ userId }] : []), { userId: null }],
          },
          orderBy: {
            userId: "desc", // userIdがnullでないレコードを優先
          },
          select: {
            id: true,
            envVars: true,
            mcpServerTemplateId: true,
            organizationId: true,
            userId: true,
            createdAt: true,
            updatedAt: true,
          },
        });

        // envVarsを復号化
        let envVars: Record<string, string> = {};
        try {
          if (mcpConfig?.envVars) {
            // envVarsは暗号化されたJSON文字列
            // 復号化はPrismaのミドルウェアで自動的に行われる
            const parsed: unknown = JSON.parse(mcpConfig.envVars);

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
            configId: mcpConfig?.id.slice(0, 8) ?? "unknown",
          });
          // 明示的にデフォルト値を設定
          envVars = {};
        }

        // Stdioの場合はcommandとargsからURLを構築
        let url = mcpServerTemplate.url ?? "";
        if (mcpServerTemplate.transportType === "STDIO") {
          const command = mcpServerTemplate.command ?? "";
          const args = mcpServerTemplate.args.join(" ");
          url = args ? `${command} ${args}` : command;
        }

        // 認証ヘッダーを注入
        const headers: Record<string, string> = {};
        if (mcpConfig) {
          try {
            await injectAuthHeaders(mcpServerTemplate, mcpConfig, headers);
          } catch (error) {
            logError("Failed to inject auth headers", error as Error, {
              mcpServerTemplateId: mcpServerTemplate.id.slice(0, 8),
              configId: mcpConfig.id.slice(0, 8),
            });
            // ヘッダー注入失敗時もサーバー設定は返す（ツールリスト取得などで使用される可能性があるため）
          }
        }

        return {
          namespace: mcpServerTemplate.name.toLowerCase().replace(/\s+/g, "-"),
          config: {
            enabled: true,
            name: mcpServerTemplate.name,
            url,
            transportType: mapTransportType(mcpServerTemplate.transportType),
            authType: mapAuthType(mcpServerTemplate.authType),
            envVars,
            headers,
          },
        };
      },
    );

    return await Promise.all(configPromises);
  } catch (error) {
    logError(
      `Failed to get enabled servers for McpServer ${mcpServerId}`,
      error as Error,
    );
    return [];
  }
};

/**
 * McpServerに対応するRemote MCPサーバー設定を取得
 *
 * 開発環境モード:
 * - DEV_MODE=true の場合、固定のContext7 MCPサーバー設定を返す
 *
 * キャッシュ:
 * - Redis経由でキャッシュを使用（REDIS_URL環境変数が設定されている場合）
 * - キャッシュTTL: 300秒（CACHE_TTL環境変数でカスタマイズ可能）
 * - キャッシュミス時はDBから取得してキャッシュに保存
 *
 * @param mcpServerId - McpServerのID
 * @param organizationId - 組織ID
 * @param userId - ユーザーID（オプション）
 * @returns 有効なRemote MCPサーバーの配列
 */
export const getEnabledServersForInstance = async (
  mcpServerId: string,
  organizationId: string,
  userId?: string,
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
  return await getCachedConfig(mcpServerId, () =>
    getEnabledServersForInstanceFromDB(mcpServerId, organizationId, userId),
  );
};
