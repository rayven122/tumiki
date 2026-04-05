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
 * すべてのカタログを名前の昇順で取得
 * oauthClientSecretはrendererに露出させないためnullに置換
 */
export const findAll = async (db: PrismaClient) => {
  const catalogs = await db.mcpCatalog.findMany({
    orderBy: { name: "asc" },
  });

  // シークレットをrendererに渡さない
  return catalogs.map((catalog) => ({
    ...catalog,
    oauthClientSecret: null,
  }));
};

/**
 * カタログIDからOAuthクライアント情報を復号化して取得（mainプロセス専用）
 */
export const findOAuthClientById = async (
  db: PrismaClient,
  catalogId: number,
): Promise<{
  oauthClientId: string | null;
  oauthClientSecret: string | null;
}> => {
  const catalog = await db.mcpCatalog.findUnique({
    where: { id: catalogId },
    select: { oauthClientId: true, oauthClientSecret: true },
  });

  if (!catalog) return { oauthClientId: null, oauthClientSecret: null };

  return {
    oauthClientId: catalog.oauthClientId,
    oauthClientSecret: catalog.oauthClientSecret
      ? await decryptToken(catalog.oauthClientSecret)
      : null,
  };
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
