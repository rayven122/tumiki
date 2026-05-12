import type {
  AuthType,
  McpServerConfig,
  McpToolInfo,
  ResolveHeaders,
} from "@tumiki/mcp-core-proxy";
import { createMcpClient } from "@tumiki/mcp-core-proxy";
import type { TransportType } from "@prisma/desktop-client";
import { z } from "zod";
import { getDb } from "../../shared/db";
import * as mcpRepository from "../mcp-server-list/mcp.repository";
import * as logger from "../../shared/utils/logger";
import { decryptCredentials } from "../../utils/credentials";
import {
  refreshOAuthTokenIfNeeded,
  resolveOAuthHeaders,
} from "../oauth/oauth.refresh";
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
  connectionId: number;
  connectionName: string;
  transportType: TransportType;
};

// McpConnection.args のバリデーション（string[] としてJSON.parse可能）
const connectionArgsSchema = z.array(z.string());

// McpSecret.credentials（復号後）の env バリデーション
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
// findEnabledConnections（tools あり）と findConnectionByIdWithServer（tools なし）を共通で受ける型。
// secret はどちらの finder も include しているため EnabledConnection から継承する。
type ConnectionForConfig = Omit<EnabledConnection, "tools"> & {
  tools?: Array<{ name: string; isAllowed: boolean }>;
};

const getAllowedToolNames = (conn: ConnectionForConfig) =>
  conn.tools && conn.tools.length > 0
    ? conn.tools.filter((tool) => tool.isAllowed).map((tool) => tool.name)
    : undefined;

/** OAuth接続の場合のみ resolveHeaders を返す。connectionId は再認証ディープリンク埋め込み用 */
const buildResolveHeaders = (
  conn: ConnectionForConfig,
): { resolveHeaders?: ResolveHeaders } => {
  if (conn.authType !== "OAUTH" || !conn.url) return {};
  const url = conn.url;
  return {
    resolveHeaders: () => resolveOAuthHeaders(conn.secretId, url, conn.id),
  };
};

const withAllowedTools = <T extends McpServerConfig>(
  config: T,
  conn: ConnectionForConfig,
): T => {
  const allowedTools = getAllowedToolNames(conn);
  return allowedTools ? { ...config, allowedTools } : config;
};

/**
 * 単一接続からMcpServerConfigを生成する共通ヘルパー。
 * credentials復号 → Zodバリデーション → OAuthリフレッシュ → config組み立て。
 * 生成不可（urlなし等）の場合は null を返す。
 *
 * `oauthCache` は同一 secretId を共有する複数接続のリフレッシュを冪等化するための
 * 接続ループ単位の状態。同じ secret を指す2件目以降は1件目で得た新トークンを参照し、
 * 古い refresh_token で再叩きして refresh_token rotation で `invalid_grant` を起こすのを防ぐ。
 */
const buildConfigFromConnection = async (
  conn: ConnectionForConfig,
  oauthCache: Map<number, Record<string, string>> = new Map(),
): Promise<{ config: McpServerConfig; meta: McpConnectionMeta } | null> => {
  const connLabel = `${conn.server.slug}/${conn.slug}`;
  const name = `${conn.server.slug}-${conn.slug}`;

  const plainCredentials = await decryptCredentials(conn.secret.credentials);
  let credentials = parseAndValidate(
    plainCredentials,
    connectionEnvSchema,
    `connection(${connLabel}).credentials`,
  );

  // OAuth接続: トークンの期限チェック & 必要ならリフレッシュ（secretId 単位で冪等化）
  if (conn.authType === "OAUTH" && conn.url) {
    const cached = oauthCache.get(conn.secretId);
    if (cached) {
      credentials = cached;
    } else {
      const refreshed = await refreshOAuthTokenIfNeeded(
        conn.secretId,
        conn.url,
        credentials,
      );
      if (refreshed) credentials = refreshed;
      // リフレッシュ実行後・スキップ後どちらでも、後続接続が古いスナップショットで再叩きしないようキャッシュ
      oauthCache.set(conn.secretId, credentials);
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
      config = withAllowedTools(
        {
          name,
          transportType: "STDIO",
          command: resolveValue(conn.command),
          args: resolveArgs(args),
          env: buildChildEnv(process.env, credentials),
        },
        conn,
      );
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
      config = withAllowedTools(
        {
          name,
          transportType: "SSE",
          url: conn.url,
          authType: sseAuthType,
          headers: buildHeaders(sseAuthType, credentials),
          ...buildResolveHeaders(conn),
        },
        conn,
      );
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
      config = withAllowedTools(
        {
          name,
          transportType: "STREAMABLE_HTTP",
          url: conn.url,
          authType: httpAuthType,
          headers: buildHeaders(httpAuthType, credentials),
          ...buildResolveHeaders(conn),
        },
        conn,
      );
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
      connectionId: conn.id,
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
  // 同じ secretId を共有する複数接続でのリフレッシュ重複を防ぐ（refresh_token rotation 衝突対策）。
  // 暗黙の前提: 同一 secretId の接続は同一 url を持つ（仮想MCPは元コネクタの url をコピーするため）。
  // 将来 secret 共有ながら url が異なるケースを許容する場合は、キャッシュキーを `secretId:url` に拡張する必要がある。
  const oauthCache = new Map<number, Record<string, string>>();
  for (const conn of connections) {
    try {
      const result = await buildConfigFromConnection(conn, oauthCache);
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
 * カタログ登録前のtools取得検証で発生するエラー。
 * IPC層で識別してUIに「ツール取得失敗」を伝える用途で使う。
 */
export class ToolFetchError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "ToolFetchError";
  }
}

/**
 * 与えられた `McpServerConfig` に対して `tools/list` を呼び出す共通処理。
 *
 * - タイムアウト時は失敗扱いにし、Client/Transport を確実にcloseする
 * - 失敗は `ToolFetchError` でラップし、呼び出し元で識別可能にする
 */
const fetchToolsForConfig = async (
  config: McpServerConfig,
  options?: { timeoutMs?: number },
): Promise<McpToolInfo[]> => {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TOOL_FETCH_TIMEOUT_MS;
  const { client, transport } = createMcpClient(config);

  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(
        new ToolFetchError(
          `MCP接続 "${config.name}" のツール取得がタイムアウト (${String(timeoutMs)}ms) しました`,
        ),
      );
    }, timeoutMs);
  });

  // タイムアウト時、内部の async IIFE は Promise.race の解決後も継続実行される。
  // STDIO の場合、connect 中だった子プロセスは finally の client.close() に
  // よって停止するが、その挙動は SDK の実装に依存するため完全な保証ではない。
  // 現状の MCP SDK では transport.close() がプロセスに SIGTERM を送るため、
  // タイムアウト後でもプロセスリークは発生しない想定。
  const innerPromise = (async (): Promise<McpToolInfo[]> => {
    await client.connect(transport);
    const result = await client.listTools();
    return result.tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    }));
  })();
  // タイムアウトが先に勝った場合 innerPromise は arrives-late で reject する可能性があり、
  // 誰も await しなくなって unhandled rejection になる。明示的に握りつぶして抑制する
  // （race 側ですでに別経路としてエラーが捕捉済みのため安全）。
  innerPromise.catch(() => {});

  try {
    const tools = await Promise.race([innerPromise, timeoutPromise]);
    return tools;
  } catch (error) {
    if (error instanceof ToolFetchError) throw error;
    const message = error instanceof Error ? error.message : String(error);
    throw new ToolFetchError(
      `MCP接続 "${config.name}" のツール取得に失敗しました: ${message}`,
      { cause: error },
    );
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
    try {
      await client.close();
    } catch (closeError) {
      // close失敗は警告のみ（既にツール取得結果は確定しているため致命傷ではない）
      logger.warn(`MCP接続 "${config.name}" の終了処理でエラー`, {
        error:
          closeError instanceof Error ? closeError.message : String(closeError),
      });
    }
  }
};

/**
 * 単一接続に対して `tools/list` を呼び出してツール一覧を取得する。
 * カタログ登録直後など「接続情報は保存済みだがプロキシは起動していない」状態で使用する。
 *
 * - isEnabled / authType の制限はかけない（OAUTH接続も登録時に1度はツール取得を試みる）
 *
 * @throws 接続不存在 / config組み立て失敗 / `ToolFetchError`（接続/ツール取得失敗）
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

  return fetchToolsForConfig(built.config, options);
};

/**
 * カタログ登録「前」に未永続の接続情報からtools取得を試みる。
 * 成功した場合のみ呼び出し元はDB登録に進める。
 *
 * 既存の `buildConfigFromConnection` は DB の `McpConnection` を入力とするため、
 * ここでは登録前の生credentials/argsから `McpServerConfig` を直接組み立てる。
 *
 * @throws `ToolFetchError`（タイムアウト含むtools取得失敗）/ 設定不正
 */
export const fetchToolsForConnectionInput = async (
  input: {
    name: string;
    transportType: TransportType;
    command: string | null;
    args: string;
    url: string | null;
    authType: string;
    credentials: Record<string, string>;
  },
  options?: { timeoutMs?: number },
): Promise<McpToolInfo[]> => {
  const config = buildConfigFromInput(input);
  return fetchToolsForConfig(config, options);
};

/**
 * 生入力（credentials復号済み・args文字列）から `McpServerConfig` を組み立てる。
 * `buildConfigFromConnection` が DB レコード前提なのに対し、こちらは登録前検証で使う。
 */
const buildConfigFromInput = (input: {
  name: string;
  transportType: TransportType;
  command: string | null;
  args: string;
  url: string | null;
  authType: string;
  credentials: Record<string, string>;
}): McpServerConfig => {
  switch (input.transportType) {
    case "STDIO": {
      if (!input.command) {
        throw new Error("STDIO接続にはcommandが必要です");
      }
      const args = parseAndValidate(
        input.args,
        connectionArgsSchema,
        `connection(${input.name}).args`,
      );
      return {
        name: input.name,
        transportType: "STDIO",
        command: resolveValue(input.command),
        args: resolveArgs(args),
        env: buildChildEnv(process.env, input.credentials),
      };
    }
    case "SSE": {
      if (!input.url) {
        throw new Error("SSE接続にはurlが必要です");
      }
      const sseAuthType = toProxyAuthType(input.authType);
      return {
        name: input.name,
        transportType: "SSE",
        url: input.url,
        authType: sseAuthType,
        headers: buildHeaders(sseAuthType, input.credentials),
      };
    }
    case "STREAMABLE_HTTP": {
      if (!input.url) {
        throw new Error("STREAMABLE_HTTP接続にはurlが必要です");
      }
      const httpAuthType = toProxyAuthType(input.authType);
      return {
        name: input.name,
        transportType: "STREAMABLE_HTTP",
        url: input.url,
        authType: httpAuthType,
        headers: buildHeaders(httpAuthType, input.credentials),
      };
    }
    default:
      throw new Error(
        `未対応のトランスポートタイプです: ${String(input.transportType)}`,
      );
  }
};
