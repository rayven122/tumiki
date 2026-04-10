import { getDb } from "../../shared/db";
import * as mcpRepository from "./mcp.repository";
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
