import type {
  AuthType,
  McpServerConfig,
  McpToolInfo,
} from "@tumiki/mcp-core-proxy";
import { createMcpClient } from "@tumiki/mcp-core-proxy";
import type { TransportType } from "@prisma/desktop-client";
import { z } from "zod";
import { getDb } from "../../shared/db";
import * as mcpRepository from "../mcp-server-list/mcp.repository";
import * as logger from "../../shared/utils/logger";
import { decryptCredentials } from "../../utils/credentials";
import { refreshOAuthTokenIfNeeded } from "../oauth/oauth.refresh";
import {
  buildChildEnv,
  resolveArgs,
  resolveValue,
} from "../../runtime/path-resolver";

/** ツール一覧取得のデフォルトタイムアウト（npx の初回ダウンロードを考慮し30秒） */
const DEFAULT_TOOL_FETCH_TIMEOUT_MS = 30_000;

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
        // OUTLINE_API_KEY 等、既知のキー名に一致しない場合は最初のクレデンシャルを使用
        Object.values(credentials)[0] ??
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

/**
 * 単一接続からMcpServerConfigを生成する共通ヘルパー。
 * credentials復号 → Zodバリデーション → OAuthリフレッシュ → config組み立て。
 * 生成不可（urlなし等）の場合は null を返す。
 */
const buildConfigFromConnection = async (
  conn: EnabledConnection,
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
  if (conn.authType === "OAUTH" && conn.url) {
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
      // バンドル済みランタイム (Node.js / uv) を解決し、PATHにバンドルbinを差し込む
      // これによりユーザーPCに npx / uvx が無くても MCP コネクタが起動できる
      config = {
        name,
        transportType: "STDIO",
        command: resolveValue(conn.command),
        args: resolveArgs(args),
        env: buildChildEnv(process.env, credentials),
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

/**
 * 単一接続に対して `tools/list` を呼び出してツール一覧を取得する。
 * カタログ登録直後など「接続情報は保存済みだがプロキシは起動していない」状態で使用する。
 *
 * - タイムアウトを過ぎた場合は失敗扱いにし、Client/Transport を確実にcloseする
 * - isEnabled / authType の制限はかけない（OAUTH接続も登録時に1度はツール取得を試みる）
 *
 * @throws 接続不存在 / config組み立て失敗 / 接続/ツール取得タイムアウト等
 */
export const fetchToolsForConnection = async (
  connectionId: number,
  options?: { timeoutMs?: number },
): Promise<McpToolInfo[]> => {
  const db = await getDb();
  const conn = await mcpRepository.findConnectionByIdWithServer(
    db,
    connectionId,
  );
  if (!conn) {
    throw new Error(`接続(id=${String(connectionId)})が見つかりません`);
  }

  const built = await buildConfigFromConnection(conn);
  if (!built) {
    throw new Error(
      `接続(id=${String(connectionId)})の設定組み立てに失敗しました`,
    );
  }

  const timeoutMs = options?.timeoutMs ?? DEFAULT_TOOL_FETCH_TIMEOUT_MS;
  const { client, transport } = createMcpClient(built.config);

  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(
        new Error(
          `MCP接続 "${built.meta.configName}" のツール取得がタイムアウト (${String(timeoutMs)}ms) しました`,
        ),
      );
    }, timeoutMs);
  });

  try {
    // タイムアウト時、内部の async IIFE は Promise.race の解決後も継続実行される。
    // STDIO の場合、connect 中だった子プロセスは finally の client.close() に
    // よって停止するが、その挙動は SDK の実装に依存するため完全な保証ではない。
    // 現状の MCP SDK では transport.close() がプロセスに SIGTERM を送るため、
    // タイムアウト後でもプロセスリークは発生しない想定。
    const tools = await Promise.race([
      (async (): Promise<McpToolInfo[]> => {
        await client.connect(transport);
        const result = await client.listTools();
        return result.tools.map((tool) => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema,
        }));
      })(),
      timeoutPromise,
    ]);
    return tools;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
    try {
      await client.close();
    } catch (closeError) {
      // close失敗は警告のみ（既にツール取得結果は確定しているため致命傷ではない）
      logger.warn(`MCP接続 "${built.meta.configName}" の終了処理でエラー`, {
        error:
          closeError instanceof Error ? closeError.message : String(closeError),
      });
    }
  }
};
