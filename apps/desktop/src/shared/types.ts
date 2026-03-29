/** OAuth認証セッションのタイムアウト（ミリ秒）。UIとサーバー側で共有 */
export const AUTH_SESSION_TIMEOUT_MS = 5 * 60 * 1000;

// MCPサーバー型定義
export type McpServer = {
  id: string;
  name: string;
  description: string;
  status: "running" | "stopped" | "error";
  command: string;
  args: string[];
  env?: Record<string, string>;
};

// アプリケーション設定型定義
export type AppConfig = {
  theme: "light" | "dark";
  autoStart: boolean;
  minimizeToTray: boolean;
};
