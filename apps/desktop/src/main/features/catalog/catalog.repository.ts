import type { PrismaClient } from "@prisma/desktop-client";
import { encryptToken, decryptToken } from "../../utils/encryption";

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
 * すべてのカタログを名前の昇順で取得（oauthClientSecretを復号化）
 */
export const findAll = async (db: PrismaClient) => {
  const catalogs = await db.mcpCatalog.findMany({
    orderBy: { name: "asc" },
  });

  return Promise.all(
    catalogs.map(async (catalog) => ({
      ...catalog,
      oauthClientSecret: catalog.oauthClientSecret
        ? await decryptToken(catalog.oauthClientSecret)
        : null,
    })),
  );
};

/**
 * カタログデータをupsert（nameをキーとして冪等に投入）
 */
export const upsert = async (db: PrismaClient, data: CatalogSeedData) => {
  const encryptedOauthClientSecret = data.oauthClientSecret
    ? await encryptToken(data.oauthClientSecret)
    : null;

  const dbData = {
    ...data,
    args: JSON.stringify(data.args ?? []),
    credentialKeys: JSON.stringify(data.credentialKeys),
    oauthClientSecret: encryptedOauthClientSecret,
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
