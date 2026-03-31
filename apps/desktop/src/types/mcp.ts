/**
 * MCPサーバー情報型（IPC通信用）
 */
export type McpServerItem = {
  id: number;
  name: string;
  slug: string;
  description: string;
  serverStatus: "RUNNING" | "STOPPED" | "ERROR" | "PENDING";
  isEnabled: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
  connections: McpConnectionItem[];
};

/**
 * MCP接続情報型（IPC通信用）
 */
export type McpConnectionItem = {
  id: number;
  name: string;
  slug: string;
  transportType: "STDIO" | "SSE" | "STREAMABLE_HTTP";
  command: string | null;
  args: string;
  url: string | null;
  credentials: string;
  authType: "NONE" | "BEARER" | "API_KEY" | "OAUTH";
  isEnabled: boolean;
  catalogId: number | null;
  createdAt: string;
  updatedAt: string;
};

/**
 * カタログからMCP登録する際の入力型（renderer → main）
 */
export type CreateFromCatalogInput = {
  catalogId: number;
  catalogName: string;
  description: string;
  transportType: "STDIO" | "SSE" | "STREAMABLE_HTTP";
  command: string | null;
  args: string;
  url: string | null;
  credentialKeys: string[];
  credentials: Record<string, string>;
  authType: "NONE" | "BEARER" | "API_KEY" | "OAUTH";
};
