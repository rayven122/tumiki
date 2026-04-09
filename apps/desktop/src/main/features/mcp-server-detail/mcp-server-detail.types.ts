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

/**
 * MCP接続詳細情報型（IPC通信用）
 * 接続情報 + カタログ参照 + ツール一覧を含む
 */
export type McpConnectionDetailItem = Omit<
  McpConnection,
  "createdAt" | "updatedAt" | "serverId" | "displayOrder"
> & {
  createdAt: string;
  updatedAt: string;
  catalog: Pick<McpCatalog, "id" | "name" | "description" | "iconPath"> | null;
  tools: McpToolItem[];
};

/**
 * MCPサーバー詳細情報型（IPC通信用）
 * サーバー基本情報 + 接続一覧（ツール含む）
 */
export type McpServerDetailItem = Omit<McpServer, "createdAt" | "updatedAt"> & {
  createdAt: string;
  updatedAt: string;
  connections: McpConnectionDetailItem[];
};
