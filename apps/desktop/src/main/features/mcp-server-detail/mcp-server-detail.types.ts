import type {
  McpServer,
  McpConnection,
  McpCatalog,
  McpTool,
} from "@prisma/desktop-client";

/**
 * MCPツール情報型（IPC通信用）
 * Prisma型を起点に、Date→stringへ変換
 */
export type McpToolItem = Omit<McpTool, "createdAt" | "updatedAt"> & {
  createdAt: string;
  updatedAt: string;
};

// `secretId` は内部参照のため UI には公開しない
export type McpConnectionDetailItem = Omit<
  McpConnection,
  "createdAt" | "updatedAt" | "serverId" | "displayOrder" | "secretId"
> & {
  createdAt: string;
  updatedAt: string;
  catalog: Pick<McpCatalog, "id" | "name" | "description" | "iconPath"> | null;
  tools: McpToolItem[];
};

/**
 * MCPサーバー詳細情報型（IPC通信用）
 * サーバー基本情報 + 接続一覧（ツール含む）
 *
 * 注: `McpServer` から継承するため、Prisma スキーマで追加されたフィールド
 * （例: `isPiiMaskingEnabled`）は自動的にこの型に含まれる。
 */
export type McpServerDetailItem = Omit<McpServer, "createdAt" | "updatedAt"> & {
  createdAt: string;
  updatedAt: string;
  connections: McpConnectionDetailItem[];
};
