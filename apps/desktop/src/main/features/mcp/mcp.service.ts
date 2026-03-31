import { getDb } from "../../shared/db";
import * as mcpRepository from "./mcp.repository";
import * as logger from "../../shared/utils/logger";

/**
 * 名前からslugを生成（小文字・ハイフン区切り）
 */
const toSlug = (name: string): string =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

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
 * カタログからMCPサーバーを登録
 */
export type CreateFromCatalogInput = {
  catalogId: number;
  catalogName: string;
  description: string;
  transportType: "STDIO" | "SSE" | "STREAMABLE_HTTP";
  command: string | null;
  args: string;
  url: string | null;
  credentialKeys: string[];
  credentials: Record<string, string>;
  authType: "NONE" | "BEARER" | "API_KEY" | "OAUTH";
};

export const createFromCatalog = async (
  input: CreateFromCatalogInput,
): Promise<{ serverId: number }> => {
  const db = await getDb();
  const slug = await generateUniqueSlug(input.catalogName);

  // MCPサーバー作成
  const server = await mcpRepository.createServer(db, {
    name: input.catalogName,
    slug,
    description: input.description,
  });

  // MCP接続作成
  await mcpRepository.createConnection(db, {
    name: input.catalogName,
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

  logger.info(`MCP server created from catalog: ${input.catalogName}`);

  return { serverId: server.id };
};

/**
 * 登録済みMCPサーバー一覧を取得
 */
export const getAllServers = async () => {
  const db = await getDb();
  return mcpRepository.findAllWithConnections(db);
};

/**
 * 登録済みMCP接続一覧を取得
 */
export const getAllConnections = async () => {
  const db = await getDb();
  return mcpRepository.findAllConnections(db);
};
