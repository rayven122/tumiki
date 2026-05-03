/**
 * MCPカタログアイテム型（IPC通信用）
 * Prisma McpCatalog モデルのシリアライズ版
 */
export type CatalogItem = {
  id: number;
  name: string;
  description: string;
  iconPath: string | null;
  transportType: "STDIO" | "SSE" | "STREAMABLE_HTTP";
  command: string | null;
  args: string;
  url: string | null;
  credentialKeys: string;
  authType: "NONE" | "BEARER" | "API_KEY" | "OAUTH";
  isOfficial: boolean;
  createdAt: string;
  updatedAt: string;
};
