/** カタログが提供するツールの定義（UI表示用、モックで注入される暫定データ） */
export type CatalogTool = {
  name: string;
  description: string;
};

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
  /** ツール件数（モック注入、将来 Prisma 拡張で正規化予定） */
  toolCount?: number;
  /** ツール一覧（モック注入、将来 Prisma 拡張で正規化予定） */
  tools?: CatalogTool[];
};
