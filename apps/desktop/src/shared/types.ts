import type { ElectronAPI } from "../preload";

// グローバルなWindow型を拡張
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

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

export {};
