import type { PrismaClient } from "@prisma/desktop-client";

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
  /** DCR非対応サーバー用: 事前登録済みOAuthクライアントID */
  oauthClientId?: string;
  /** DCR非対応サーバー用: 事前登録済みOAuthクライアントシークレット */
  oauthClientSecret?: string;
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
      oauthClientId: dbData.oauthClientId,
      oauthClientSecret: dbData.oauthClientSecret,
      isOfficial: dbData.isOfficial,
    },
    create: dbData,
  });
};
