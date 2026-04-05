import type { McpServerConfig } from "@tumiki/mcp-proxy-core";
import { getDb } from "../../shared/db";
import * as mcpRepository from "./mcp.repository";
import * as logger from "../../shared/utils/logger";
import { toSlug } from "../../../shared/mcp.slug";
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
    credentials: JSON.stringify(input.credentials),
    authType: input.authType,
    serverId: server.id,
    catalogId: input.catalogId,
  });

  logger.info(`MCP server created from catalog: ${uniqueName}`);

  return { serverId: server.id, serverName: uniqueName };
};

/**
 * 登録済みMCPサーバー一覧を取得
 */
export const getAllServers = async () => {
  const db = await getDb();
  return mcpRepository.findAllWithConnections(db);
};

/**
 * 有効な接続からMcpServerConfig[]を生成（Proxy起動時に使用）
 */
export const getEnabledConfigs = async (): Promise<McpServerConfig[]> => {
  const db = await getDb();
  const connections = await mcpRepository.findEnabledConnections(db);

  return connections
    .filter((conn) => conn.transportType === "STDIO" && conn.command)
    .map((conn) => ({
      name: `${conn.server.slug}/${conn.slug}`,
      command: conn.command as string,
      args: JSON.parse(conn.args) as string[],
      env: JSON.parse(conn.credentials) as Record<string, string>,
    }));
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
