// サーバー状態
export type ServerStatus = "running" | "stopped" | "error" | "pending";

// MCPサーバー設定（PoCではハードコード）
export type McpServerConfig = {
  name: string;
  command: string;
  args: string[];
  env: Record<string, string>;
};

// MCPサーバーの状態
export type McpServerState = {
  name: string;
  status: ServerStatus;
  error?: string;
  tools: McpToolInfo[];
};

// ツール情報
export type McpToolInfo = {
  name: string;
  description?: string;
  inputSchema: unknown;
};

// ツール実行結果
export type CallToolResult = {
  content: unknown[];
  isError?: boolean;
};

// Logger型（注入用）
export type Logger = {
  info: (msg: string, meta?: unknown) => void;
  error: (msg: string, meta?: unknown) => void;
  warn: (msg: string, meta?: unknown) => void;
  debug: (msg: string, meta?: unknown) => void;
};

// call-toolリクエストのペイロード
export type CallToolPayload = {
  name: string;
  arguments: Record<string, unknown>;
};

// Main → Proxy Process（リクエスト）— discriminated union でペイロードの型安全性を保証
export type ProxyRequest =
  | { id: string; type: "start" }
  | { id: string; type: "stop" }
  | { id: string; type: "list-tools" }
  | { id: string; type: "call-tool"; payload: CallToolPayload }
  | { id: string; type: "status" };

// Proxy → Main（レスポンス）
export type ProxyResponse = {
  id: string;
  ok: boolean;
  result?: unknown;
  error?: string;
};

// Proxy → Main（Push通知）
export type ProxyEvent = {
  type: "status-changed";
  payload: { name: string; status: ServerStatus; error?: string };
};
