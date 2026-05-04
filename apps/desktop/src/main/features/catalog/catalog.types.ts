import type {
  CatalogConnectionTemplate,
  CatalogPermissions,
  CatalogStatus,
} from "../../../types/catalog";

/**
 * カタログからMCPサーバーを追加する際の統一入力型（renderer → main）
 * renderer側はモードを意識せず、この型で統一的にIPCを呼び出す。
 */
export type AddFromCatalogInput = {
  catalogId: string;
  serverName: string;
  description: string;
  status: CatalogStatus;
  permissions: CatalogPermissions;
  connectionTemplate: CatalogConnectionTemplate;
  tools: Array<{ name: string; allowed: boolean }>;
  credentials: Record<string, string>;
};
