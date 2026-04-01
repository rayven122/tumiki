import type {
  McpServer,
  McpConnection,
  McpCatalog,
} from "../../../../prisma/generated/client";

/**
 * MCPサーバー情報型（IPC通信用）
 * Prisma型を起点に、Date→stringへ変換 + connections を付与
 */
export type McpServerItem = Omit<McpServer, "createdAt" | "updatedAt"> & {
  createdAt: string;
  updatedAt: string;
  connections: McpConnectionItem[];
};

/**
 * MCP接続情報型（IPC通信用）
 * Prisma型を起点に、Date→stringへ変換 + catalog を付与
 */
export type McpConnectionItem = Omit<
  McpConnection,
  "createdAt" | "updatedAt" | "serverId" | "displayOrder"
> & {
  createdAt: string;
  updatedAt: string;
  catalog: Pick<McpCatalog, "id" | "name" | "description" | "iconPath"> | null;
};

/**
 * カタログからMCP登録する際の入力型（renderer → main）
 * preload / ipc / service で共通使用する唯一の定義
 */
export type CreateFromCatalogInput = {
  catalogId: number;
  catalogName: string;
  description: string;
  transportType: McpConnection["transportType"];
  command: string | null;
  args: string;
  url: string | null;
  credentialKeys: string[];
  credentials: Record<string, string>;
  authType: McpConnection["authType"];
};
