import type { McpCatalog } from "@prisma/desktop-client";
import type { CatalogItem } from "../../../types/catalog";

/**
 * ローカルSQLiteの McpCatalog レコードを renderer が期待する CatalogItem 型に変換する。
 * 個人利用モードでは権限・ステータスの概念がないため、すべて利用可能として扱う。
 */
export const toCatalogItem = (local: McpCatalog): CatalogItem => {
  const args: string[] = JSON.parse(local.args) as string[];
  const credentialKeys: string[] = JSON.parse(local.credentialKeys) as string[];

  return {
    id: String(local.id),
    name: local.name,
    description: local.description,
    iconUrl: local.iconPath,
    status: "available",
    permissions: { read: true, write: true, execute: true },
    transportType: local.transportType,
    authType: local.authType,
    requiredCredentialKeys: credentialKeys,
    tools: [],
    connectionTemplate: {
      transportType: local.transportType,
      command: local.command,
      args,
      url: local.url,
      authType: local.authType,
      credentialKeys,
    },
  };
};
