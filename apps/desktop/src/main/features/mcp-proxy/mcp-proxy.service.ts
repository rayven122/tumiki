import type { AuthType, McpServerConfig } from "@tumiki/mcp-proxy-core";
import type { TransportType } from "@prisma/desktop-client";
import { z } from "zod";
import { getDb } from "../../shared/db";
import * as mcpRepository from "../mcp-server-list/mcp.repository";
import * as mcpProxyRepository from "./mcp-proxy.repository";
import * as logger from "../../shared/utils/logger";
import { decryptCredentials } from "../../utils/credentials";
import { refreshOAuthTokenIfNeeded } from "../oauth/oauth.refresh";

/** CLI監査ログ用: configName → DB情報のマッピング */
export type McpConnectionMeta = {
  configName: string;
  serverId: number;
  connectionName: string;
  transportType: TransportType;
};

// McpConnection.args のバリデーション（string[] としてJSON.parse可能）
const connectionArgsSchema = z.array(z.string());

// McpConnection.credentials（復号後）の env バリデーション
// 値は string のみ受け付ける（環境変数は文字列のため）
const connectionEnvSchema = z.record(z.string(), z.string());

/**
 * 文字列を JSON.parse → Zod スキーマで検証する共通ヘルパー。
 * 失敗時は詳細を含む Error を throw する（呼び出し側で try/catch する前提）。
 */
const parseAndValidate = <T>(
  raw: string,
  schema: z.ZodType<T>,
  fieldName: string,
): T => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    throw new Error(`${fieldName} is not valid JSON: ${message}`);
  }
  const result = schema.safeParse(parsed);
  if (!result.success) {
    throw new Error(
      `${fieldName} failed schema validation: ${result.error.message}`,
    );
  }
  return result.data;
};

/**
 * 認証ヘッダーを組み立て
 */
const buildHeaders = (
  authType: AuthType,
  credentials: Record<string, string>,
): Record<string, string> => {
  switch (authType) {
    case "BEARER": {
      const token =
        credentials["token"] ??
        credentials["accessToken"] ??
        credentials["access_token"] ??
        "";
      return token ? { Authorization: `Bearer ${token}` } : {};
    }
    case "API_KEY":
      return { ...credentials };
    case "NONE":
    default:
      return {};
  }
};

/**
 * Prisma AuthType → proxy AuthType マッピング
 */
const toProxyAuthType = (prismaAuthType: string): AuthType => {
  if (prismaAuthType === "BEARER") return "BEARER";
  if (prismaAuthType === "API_KEY") return "API_KEY";
  if (prismaAuthType === "OAUTH") return "BEARER";
  return "NONE";
};

/** findEnabledConnections の戻り値1要素の型 */
type EnabledConnection = Awaited<
  ReturnType<typeof mcpRepository.findEnabledConnections>
>[number];

type BuildConfigOptions = {
  /** OAuthトークンリフレッシュをスキップする（リフレッシュ済みの場合） */
  skipOAuthRefresh?: boolean;
};

/**
 * 単一接続からMcpServerConfigを生成する共通ヘルパー。
 * credentials復号 → Zodバリデーション → OAuthリフレッシュ（任意）→ config組み立て。
 * 生成不可（urlなし等）の場合は null を返す。
 */
const buildConfigFromConnection = async (
  conn: EnabledConnection,
  options: BuildConfigOptions = {},
): Promise<{ config: McpServerConfig; meta: McpConnectionMeta } | null> => {
  const connLabel = `${conn.server.slug}/${conn.slug}`;
  const name = `${conn.server.slug}-${conn.slug}`;

  const plainCredentials = await decryptCredentials(conn.credentials);
  let credentials = parseAndValidate(
    plainCredentials,
    connectionEnvSchema,
    `connection(${connLabel}).credentials`,
  );

  // OAuth接続: トークンの期限チェック & 必要ならリフレッシュ
  if (!options.skipOAuthRefresh && conn.authType === "OAUTH" && conn.url) {
    const refreshed = await refreshOAuthTokenIfNeeded(
      conn.id,
      conn.url,
      credentials,
    );
    if (refreshed) {
      credentials = refreshed;
    }
  }

  let config: McpServerConfig;
  switch (conn.transportType) {
    case "STDIO": {
      if (!conn.command) {
        logger.warn(
          `MCP接続 "${connLabel}" はSTDIOですがcommandが未設定です（skip）`,
        );
        return null;
      }
      const args = parseAndValidate(
        conn.args,
        connectionArgsSchema,
        `connection(${connLabel}).args`,
      );
      config = {
        name,
        transportType: "STDIO",
        command: conn.command,
        args,
        env: credentials,
      };
      break;
    }
    case "SSE": {
      if (!conn.url) {
        logger.warn(
          `MCP接続 "${connLabel}" はSSEですがurlが未設定です（skip）`,
        );
        return null;
      }
      const sseAuthType = toProxyAuthType(conn.authType);
      config = {
        name,
        transportType: "SSE",
        url: conn.url,
        authType: sseAuthType,
        headers: buildHeaders(sseAuthType, credentials),
      };
      break;
    }
    case "STREAMABLE_HTTP": {
      if (!conn.url) {
        logger.warn(
          `MCP接続 "${connLabel}" はSTREAMABLE_HTTPですがurlが未設定です（skip）`,
        );
        return null;
      }
      const httpAuthType = toProxyAuthType(conn.authType);
      config = {
        name,
        transportType: "STREAMABLE_HTTP",
        url: conn.url,
        authType: httpAuthType,
        headers: buildHeaders(httpAuthType, credentials),
      };
      break;
    }
    default:
      logger.warn(
        `MCP接続 "${connLabel}" は未対応のトランスポートタイプです（skip）`,
        { transportType: conn.transportType },
      );
      return null;
  }

  return {
    config,
    meta: {
      configName: name,
      serverId: conn.server.id,
      connectionName: conn.name,
      transportType: conn.transportType,
    },
  };
};

/**
 * 有効な接続からMcpServerConfig[]を生成（Proxy起動時に使用）
 *
 * - credentials はDB上で暗号化済みのため、復号してから展開する
 * - Anthropic API の tool name 制約 (^[a-zA-Z0-9_-]{1,64}$) に合わせ、
 *   サーバー名セパレータは `-` を使用する（`/` は tool name として拒否される）
 * - 各接続のバリデーションは独立しており、1件の不正データで他の接続が
 *   起動できなくなることはない（エラーは logger.error でスキップ）
 */
const buildConfigsFromConnections = async (
  serverSlug?: string,
): Promise<{ configs: McpServerConfig[]; meta: McpConnectionMeta[] }> => {
  const db = await getDb();
  const connections = serverSlug
    ? await mcpRepository.findEnabledConnectionsBySlug(db, serverSlug)
    : await mcpRepository.findEnabledConnections(db);

  const configs: McpServerConfig[] = [];
  const meta: McpConnectionMeta[] = [];
  for (const conn of connections) {
    try {
      const result = await buildConfigFromConnection(conn);
      if (result) {
        configs.push(result.config);
        meta.push(result.meta);
      }
    } catch (error) {
      const connLabel = `${conn.server.slug}/${conn.slug}`;
      const message = error instanceof Error ? error.message : String(error);
      logger.error(
        `MCP接続 "${connLabel}" の設定読み込みに失敗したためスキップします`,
        { error: message },
      );
    }
  }
  return { configs, meta };
};

/** OAuth接続のトークン有効期限情報 */
export type OAuthConnectionExpiry = {
  configName: string;
  connectionId: number;
  serverUrl: string;
  expiresAt: number;
};

/**
 * 有効なOAuth接続の期限情報を取得（プロアクティブリフレッシュタイマー用）
 */
export const getOAuthConnectionExpiries = async (
  serverSlug?: string,
): Promise<OAuthConnectionExpiry[]> => {
  const db = await getDb();
  const connections = serverSlug
    ? await mcpRepository.findEnabledConnectionsBySlug(db, serverSlug)
    : await mcpRepository.findEnabledConnections(db);

  const expiries: OAuthConnectionExpiry[] = [];
  for (const conn of connections) {
    if (conn.authType !== "OAUTH" || !conn.url) continue;

    try {
      const plainCredentials = await decryptCredentials(conn.credentials);
      const credentials = parseAndValidate(
        plainCredentials,
        connectionEnvSchema,
        `connection(${conn.server.slug}/${conn.slug}).credentials`,
      );

      const expiresAt = credentials["expires_at"];
      if (expiresAt) {
        const expiresAtSec = Number(expiresAt);
        if (!Number.isNaN(expiresAtSec)) {
          expiries.push({
            configName: `${conn.server.slug}-${conn.slug}`,
            connectionId: conn.id,
            serverUrl: conn.url,
            expiresAt: expiresAtSec,
          });
        }
      }
    } catch {
      // credentials復号失敗は無視（buildConfigsFromConnectionsでログ済み）
    }
  }
  return expiries;
};

/**
 * OAuth接続のリフレッシュ → config再生成を一括で行う（プロアクティブリフレッシュタイマー用）
 *
 * 1. リポジトリ経由で単一接続を取得
 * 2. credentials を復号 + Zodバリデーション
 * 3. refreshOAuthTokenIfNeeded でトークンリフレッシュ
 * 4. リフレッシュ後の credentials で config を再生成（二重リフレッシュ防止: skipOAuthRefresh）
 */
export const refreshAndRebuildOAuthConnection = async (
  connectionId: number,
  serverUrl: string,
): Promise<{ configName: string; config: McpServerConfig } | null> => {
  const db = await getDb();
  const conn = await mcpProxyRepository.findEnabledConnectionById(
    db,
    connectionId,
  );
  if (!conn) return null;

  const connLabel = `${conn.server.slug}/${conn.slug}`;
  const plainCredentials = await decryptCredentials(conn.credentials);
  const credentials = parseAndValidate(
    plainCredentials,
    connectionEnvSchema,
    `connection(${connLabel}).credentials`,
  );

  const refreshed = await refreshOAuthTokenIfNeeded(
    connectionId,
    serverUrl,
    credentials,
  );
  if (!refreshed) return null;

  // リフレッシュ済みなので skipOAuthRefresh で二重リフレッシュを防止
  const result = await buildConfigFromConnection(conn, {
    skipOAuthRefresh: true,
  });
  if (!result) return null;

  return { configName: result.meta.configName, config: result.config };
};

/**
 * 有効な接続からMcpServerConfig[]を生成（Proxy起動時に使用）
 */
export const getEnabledConfigs = async (
  serverSlug?: string,
): Promise<McpServerConfig[]> => {
  const { configs } = await buildConfigsFromConnections(serverSlug);
  return configs;
};

/**
 * 有効な接続からMcpServerConfig[]とメタデータを生成（CLI監査ログ用）
 */
export const getEnabledConfigsWithMeta = async (
  serverSlug?: string,
): Promise<{ configs: McpServerConfig[]; meta: McpConnectionMeta[] }> => {
  return buildConfigsFromConnections(serverSlug);
};
