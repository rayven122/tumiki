import { getDb } from "../../shared/db";
import * as mcpRepository from "./mcp.repository";
import * as mcpConnection from "./mcp.connection";
import * as logger from "../../shared/utils/logger";
import { toSlug } from "../../../shared/mcp.slug";
import { encryptToken, decryptToken } from "../../utils/encryption";
import type { CreateFromCatalogInput } from "./mcp.types";

// IPC / テストから参照できるよう re-export
export type { CreateFromCatalogInput } from "./mcp.types";

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
 * 接続確認が必要か判定
 * リモート（Streamable HTTP / SSE）+ API_KEY/BEARER認証時のみ接続確認を行う
 * STDIOはtools/listでAPIキー検証が行われないため接続確認の対象外
 */
const needsConnectionVerification = (input: CreateFromCatalogInput): boolean =>
  (input.transportType === "STREAMABLE_HTTP" ||
    input.transportType === "SSE") &&
  (input.authType === "API_KEY" || input.authType === "BEARER") &&
  input.url !== null;

/**
 * credentialsからHTTPヘッダーを構築
 *
 * - API_KEY: credentialsのキー=ヘッダー名、値=ヘッダー値としてそのまま使用
 * - BEARER: 最初のcredential値を Authorization: Bearer <value> として送信
 */
const buildHeaders = (
  input: CreateFromCatalogInput,
): Record<string, string> => {
  if (input.authType === "BEARER") {
    const token = Object.values(input.credentials)[0];
    return token ? { Authorization: `Bearer ${token}` } : {};
  }
  return input.credentials;
};

/**
 * リモートMCPサーバーに接続してツール一覧を取得
 */
const fetchTools = async (
  input: CreateFromCatalogInput,
): Promise<mcpConnection.McpToolData[]> => {
  const url = input.url!;
  const headers = buildHeaders(input);

  if (input.transportType === "SSE") {
    return mcpConnection.listToolsSSE(url, headers);
  }
  return mcpConnection.listToolsHTTP(url, headers);
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

  // 接続確認 + ツール取得
  let tools: mcpConnection.McpToolData[] = [];
  if (needsConnectionVerification(input)) {
    logger.info("リモートMCPサーバーへの接続確認を開始", {
      url: input.url,
      transportType: input.transportType,
    });
    tools = await fetchTools(input);
    logger.info(`ツール${tools.length}件を取得しました`, { url: input.url });
  }

  // MCPサーバー作成
  const server = await mcpRepository.createServer(db, {
    name: uniqueName,
    slug,
    description: input.description,
  });

  // MCP接続作成
  const connection = await mcpRepository.createConnection(db, {
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

  // ツールをDB保存（接続確認で取得した場合）
  if (tools.length > 0) {
    await mcpRepository.createTools(
      db,
      tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
        connectionId: connection.id,
      })),
    );

    // 接続確認成功 → サーバーステータスをRUNNINGに
    await mcpRepository.updateServerStatus(db, server.id, "RUNNING");
  }

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
