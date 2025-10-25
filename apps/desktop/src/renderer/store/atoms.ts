import { atom } from "jotai";
import type { McpServer, AppConfig } from "../../shared/types";

// MCPサーバー一覧
export const mcpServersAtom = atom<McpServer[]>([]);

// アプリケーション設定
export const appConfigAtom = atom<AppConfig>({
  theme: "light",
  autoStart: false,
  minimizeToTray: true,
});

// 現在選択中のサーバー
export const selectedServerAtom = atom<string | null>(null);
