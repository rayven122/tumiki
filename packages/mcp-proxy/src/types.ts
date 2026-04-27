// サーバー状態
export type ServerStatus = "running" | "stopped" | "error" | "pending";

// 認証タイプ（HTTP系トランスポート用）
export type AuthType = "NONE" | "BEARER" | "API_KEY";

// STDIO トランスポート設定
export type StdioServerConfig = {
  name: string;
  transportType: "STDIO";
  command: string;
  args: string[];
  env: Record<string, string>;
};

// SSE トランスポート設定
export type SseServerConfig = {
  name: string;
  transportType: "SSE";
  url: string;
  authType: AuthType;
  headers: Record<string, string>;
};

// Streamable HTTP トランスポート設定
export type StreamableHttpServerConfig = {
  name: string;
  transportType: "STREAMABLE_HTTP";
  url: string;
  authType: AuthType;
  headers: Record<string, string>;
};

// MCPサーバー設定（discriminated union）
export type McpServerConfig =
  | StdioServerConfig
  | SseServerConfig
  | StreamableHttpServerConfig;

// 複数MCPサーバーを束ねたグループ設定
export type McpServerGroupConfig = {
  name: string;
  servers: McpServerConfig[];
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
  serverName?: string;
};

// ツール実行結果
export type CallToolResult = {
  content: unknown[];
  isError?: boolean;
};

// ツール実行イベント（監査ログ等の外部処理を注入するためのコールバック型）
export type ToolCallEvent = {
  /** プレフィックス付きツール名（例: "server-name__tool-name"） */
  prefixedToolName: string;
  /** ツール引数 */
  args: Record<string, unknown>;
  /** 実行時間（ミリ秒） */
  durationMs: number;
  /** 成功/失敗 */
  isSuccess: boolean;
  /** エラーメッセージ（失敗時のみ） */
  errorMessage?: string;
  /** レスポンスコンテンツ */
  resultContent: unknown[];
  /** AIクライアント名（例: "claude-code", "cursor"） */
  clientName?: string;
  /** AIクライアントバージョン */
  clientVersion?: string;
};

export type ToolCallHook = (event: ToolCallEvent) => void | Promise<void>;

// ツール呼び出しフィルタ（PII マスキング等）
// beforeCall で args を変換または block、afterCall で result を変換する
export type ToolCallFilter = {
  // リクエスト送信前: args を変換し、afterCall に渡すコンテキストを返す
  // blocked が返された場合は upstream を呼ばずにエラー応答を返す
  beforeCall: (
    toolName: string,
    args: Record<string, unknown>,
  ) => Promise<{
    args: Record<string, unknown>;
    context: unknown;
    blocked?: { reason: string };
  }>;
  // レスポンス受信後: context を使って result を変換する
  afterCall: (
    context: unknown,
    result: CallToolResult,
  ) => Promise<CallToolResult>;
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

// startリクエストのペイロード
export type StartPayload = {
  configs: McpServerConfig[];
};

// Main → Proxy Process（リクエスト）— discriminated union でペイロードの型安全性を保証
export type ProxyRequest =
  | { id: string; type: "start"; payload: StartPayload }
  | { id: string; type: "stop" }
  | { id: string; type: "list-tools" }
  | { id: string; type: "call-tool"; payload: CallToolPayload }
  | { id: string; type: "status" };

// Proxy → Main（レスポンス）— discriminated union で ok/error の型安全性を保証
export type ProxyResponse =
  | { id: string; ok: true; result?: unknown }
  | { id: string; ok: false; error: string };

// Proxy → Main（Push通知）
export type ProxyEvent = {
  type: "status-changed";
  payload: { name: string; status: ServerStatus; error?: string };
};
