export type CatalogAuthType = "NONE" | "BEARER" | "API_KEY" | "OAUTH";
export type CatalogTransportType = "STDIO" | "SSE" | "STREAMABLE_HTTP";
export type CatalogStatus = "available" | "request_required" | "disabled";

export type CatalogConnectionTemplate = {
  transportType: CatalogTransportType;
  command: string | null;
  args: string[];
  url: string | null;
  authType: CatalogAuthType;
  credentialKeys: string[];
};

export type CatalogPermissions = {
  read: boolean;
  write: boolean;
  execute: boolean;
};

export type CatalogToolPreview = {
  id?: string;
  name: string;
  description: string;
  allowed: boolean;
  reviewStatus?: string;
};

/**
 * Manager API由来のMCPカタログアイテム型（IPC通信用）
 */
export type CatalogItem = {
  id: string;
  name: string;
  description: string;
  iconUrl: string | null;
  status: CatalogStatus;
  permissions: CatalogPermissions;
  transportType: CatalogTransportType;
  authType: CatalogAuthType;
  requiredCredentialKeys: string[];
  tools: CatalogToolPreview[];
  connectionTemplate: CatalogConnectionTemplate;
};

/**
 * Desktop SQLite上のローカルカタログ型。
 * 仮想MCP作成など、既存のローカルMcpCatalog参照が必要な画面だけで使う。
 */
export type LocalCatalogItem = {
  id: number;
  name: string;
  description: string;
  iconPath: string | null;
  transportType: CatalogTransportType;
  command: string | null;
  args: string;
  url: string | null;
  credentialKeys: string;
  authType: CatalogAuthType;
  isOfficial: boolean;
  createdAt: string;
  updatedAt: string;
};
