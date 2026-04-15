import type { AuthType, McpServerConfig } from "@tumiki/mcp-proxy-core";
import { z } from "zod";
import { getDb } from "../../shared/db";
import * as mcpRepository from "./mcp.repository";
import * as logger from "../../shared/utils/logger";
import { toSlug } from "../../../shared/mcp.slug";
import { encryptToken, decryptToken } from "../../utils/encryption";
import type { CreateFromCatalogInput } from "./mcp.types";

// IPC / テストから参照できるよう re-export
export type { CreateFromCatalogInput } from "./mcp.types";

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
 * 一意なslugを生成（重複時はサフィックス付与）
 */
const generateUniqueSlug = async (name: string): Promise<string> => {
  const db = await getDb();
  const baseSlug = toSlug(name);
  let slug = baseSlug;
  let counter = 1;

  while (await mcpRepository.findServerBySlug(db, slug)) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
};

/**
 * 一意なサーバー名を生成（重複時はサフィックス付与）
 */
const generateUniqueName = async (name: string): Promise<string> => {
  const db = await getDb();
  let candidateName = name;
  let counter = 2;

  while (await mcpRepository.findServerByName(db, candidateName)) {
    candidateName = `${name} ${counter}`;
    counter++;
  }

  return candidateName;
};

/**
 * カタログからMCPサーバーを登録
 */
export const createFromCatalog = async (
  input: CreateFromCatalogInput,
): Promise<{ serverId: number; serverName: string }> => {
  const db = await getDb();
  const uniqueName = await generateUniqueName(input.catalogName);
  const slug = await generateUniqueSlug(uniqueName);

  // MCPサーバー作成
  const server = await mcpRepository.createServer(db, {
    name: uniqueName,
    slug,
    description: input.description,
  });

  // MCP接続作成
  await mcpRepository.createConnection(db, {
    name: uniqueName,
    slug,
    transportType: input.transportType,
    command: input.command,
    args: input.args,
    url: input.url,
    credentials: await encryptToken(JSON.stringify(input.credentials)),
    authType: input.authType,
    serverId: server.id,
    catalogId: input.catalogId,
  });

  logger.info(`MCP server created from catalog: ${uniqueName}`);

  return { serverId: server.id, serverName: uniqueName };
};

/**
 * 暗号化済みか平文かを判定して復号する（既存データとの互換性を保つ）
 */
const decryptCredentials = async (credentials: string): Promise<string> => {
  if (credentials.startsWith("safe:") || credentials.startsWith("fallback:")) {
    return decryptToken(credentials);
  }
  return credentials;
};

/**
 * 登録済みMCPサーバー一覧を取得
 */
export const getAllServers = async () => {
  const db = await getDb();
  const servers = await mcpRepository.findAllWithConnections(db);
  return Promise.all(
    servers.map(async (server) => ({
      ...server,
      connections: await Promise.all(
        server.connections.map(async (conn) => ({
          ...conn,
          credentials: conn.credentials
            ? await decryptCredentials(conn.credentials)
            : conn.credentials,
        })),
      ),
    })),
  );
};

/**
 * 認証ヘッダーを組み立て
 */
const buildHeaders = (
  authType: string,
  credentials: Record<string, string>,
): Record<string, string> => {
  switch (authType) {
    case "BEARER": {
      const token = credentials["token"] ?? credentials["accessToken"] ?? "";
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
  return "NONE";
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
export const getEnabledConfigs = async (
  serverSlug?: string,
): Promise<McpServerConfig[]> => {
  const db = await getDb();
  const connections = serverSlug
    ? await mcpRepository.findEnabledConnectionsBySlug(db, serverSlug)
    : await mcpRepository.findEnabledConnections(db);

  const configs: McpServerConfig[] = [];
  for (const conn of connections) {
    const connLabel = `${conn.server.slug}/${conn.slug}`;
    const name = `${conn.server.slug}-${conn.slug}`;

    try {
      const plainCredentials = await decryptCredentials(conn.credentials);
      const credentials = parseAndValidate(
        plainCredentials,
        connectionEnvSchema,
        `connection(${connLabel}).credentials`,
      );

      switch (conn.transportType) {
        case "STDIO": {
          if (!conn.command) {
            logger.warn(
              `MCP接続 "${connLabel}" はSTDIOですがcommandが未設定です（skip）`,
            );
            continue;
          }
          const args = parseAndValidate(
            conn.args,
            connectionArgsSchema,
            `connection(${connLabel}).args`,
          );
          configs.push({
            name,
            transportType: "STDIO",
            command: conn.command,
            args,
            env: credentials,
          });
          break;
        }
        case "SSE": {
          if (!conn.url) {
            logger.warn(
              `MCP接続 "${connLabel}" はSSEですがurlが未設定です（skip）`,
            );
            continue;
          }
          configs.push({
            name,
            transportType: "SSE",
            url: conn.url,
            authType: toProxyAuthType(conn.authType),
            headers: buildHeaders(conn.authType, credentials),
          });
          break;
        }
        case "STREAMABLE_HTTP": {
          if (!conn.url) {
            logger.warn(
              `MCP接続 "${connLabel}" はSTREAMABLE_HTTPですがurlが未設定です（skip）`,
            );
            continue;
          }
          configs.push({
            name,
            transportType: "STREAMABLE_HTTP",
            url: conn.url,
            authType: toProxyAuthType(conn.authType),
            headers: buildHeaders(conn.authType, credentials),
          });
          break;
        }
        default:
          logger.warn(
            `MCP接続 "${connLabel}" は未対応のトランスポートタイプです（skip）`,
            { transportType: conn.transportType },
          );
          continue;
      }
    } catch (error) {
      // 1件の破損データで他サーバーが起動できなくなることを防ぐ：
      // エラーを個別にログしてスキップ、他の接続は正常に起動する
      const message = error instanceof Error ? error.message : String(error);
      logger.error(
        `MCP接続 "${connLabel}" の設定読み込みに失敗したためスキップします`,
        { error: message },
      );
    }
  }
  return configs;
};

/**
 * サーバー情報を更新
 */
export const updateServer = async (
  id: number,
  data: { name?: string; description?: string },
) => {
  const db = await getDb();
  return mcpRepository.updateServer(db, id, data);
};

/**
 * サーバーを削除
 */
export const deleteServer = async (id: number) => {
  const db = await getDb();
  return mcpRepository.deleteServer(db, id);
};

/**
 * サーバーのenabled状態を切り替え
 */
export const toggleServer = async (id: number, isEnabled: boolean) => {
  const db = await getDb();
  return mcpRepository.toggleServerEnabled(db, id, isEnabled);
};
