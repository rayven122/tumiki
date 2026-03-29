import { atom } from "jotai";
import type { McpServer, AppConfig } from "../../shared/types";

// MCPサーバー一覧
export const mcpServersAtom = atom<McpServer[]>([]);

// アプリケーション設定
export const appConfigAtom = atom<AppConfig>({
  theme: "dark",
  autoStart: false,
  minimizeToTray: true,
});

// 現在選択中のサーバー
export const selectedServerAtom = atom<string | null>(null);

// サイドバーの開閉状態
export const sidebarOpenAtom = atom(true);

// テーマ派生atom（読み書き可能）
export const themeAtom = atom(
  (get) => get(appConfigAtom).theme,
  (get, set, newTheme: "light" | "dark") => {
    set(appConfigAtom, { ...get(appConfigAtom), theme: newTheme });
  },
);
