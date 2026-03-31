import type { PrismaClient } from "../../../../prisma/generated/client";

/**
 * カタログシードデータの型
 */
export type CatalogSeedData = {
  name: string;
  description: string;
  iconPath: string;
  transportType: "STDIO" | "SSE" | "STREAMABLE_HTTP";
  command: string;
  args: string;
  credentialKeys: string;
  authType: "NONE" | "BEARER" | "API_KEY" | "OAUTH";
  isOfficial: boolean;
};

/**
 * すべてのカタログを名前の昇順で取得
 */
export const findAll = async (db: PrismaClient) => {
  return db.mcpCatalog.findMany({
    orderBy: { name: "asc" },
  });
};

/**
 * カタログデータをupsert（nameをキーとして冪等に投入）
 */
export const upsert = async (db: PrismaClient, data: CatalogSeedData) => {
  return db.mcpCatalog.upsert({
    where: { name: data.name },
    update: {
      description: data.description,
      iconPath: data.iconPath,
      transportType: data.transportType,
      command: data.command,
      args: data.args,
      credentialKeys: data.credentialKeys,
      authType: data.authType,
      isOfficial: data.isOfficial,
    },
    create: data,
  });
};
