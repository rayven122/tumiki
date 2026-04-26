import type { PrismaClient } from "@prisma/desktop-client";
import type { DbClient } from "../../shared/db";

/**
 * カタログシードデータの型
 */
export type CatalogSeedData = {
  name: string;
  description: string;
  iconPath: string;
  transportType: "STDIO" | "SSE" | "STREAMABLE_HTTP";
  command?: string;
  args?: string[];
  url?: string;
  credentialKeys: string[];
  authType: "NONE" | "BEARER" | "API_KEY" | "OAUTH";
  isOfficial: boolean;
};

/**
 * すべてのカタログを名前の昇順で取得
 */
export const findAll = async (db: DbClient) => {
  return db.mcpCatalog.findMany({
    orderBy: { name: "asc" },
  });
};

/**
 * IDでカタログを取得（仮想MCP作成時の各接続に紐付くカタログ参照用）
 */
export const findById = async (db: DbClient, id: number) => {
  return db.mcpCatalog.findUnique({ where: { id } });
};

/**
 * カタログデータをupsert（nameをキーとして冪等に投入）
 */
export const upsert = async (db: PrismaClient, data: CatalogSeedData) => {
  const dbData = {
    ...data,
    args: JSON.stringify(data.args ?? []),
    credentialKeys: JSON.stringify(data.credentialKeys),
  };

  return db.mcpCatalog.upsert({
    where: { name: data.name },
    update: {
      description: dbData.description,
      iconPath: dbData.iconPath,
      transportType: dbData.transportType,
      command: dbData.command,
      args: dbData.args,
      url: dbData.url,
      credentialKeys: dbData.credentialKeys,
      authType: dbData.authType,
      isOfficial: dbData.isOfficial,
    },
    create: dbData,
  });
};
