import { atom } from "jotai";
import type { McpServer, AppConfig } from "../../shared/types";

// コネクタ一覧
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

/**
 * deeplink 経由で再認証が完了したことを ToolDetail に伝えるシグナル。
 * 値はインクリメンタルな番号で、変化すると ToolDetail が getDetail を再フェッチする。
 *
 * deeplink 経由の reauth は main プロセスが直接 manager.reauthenticateConnection を
 * 呼ぶため、画面上の runReauth を経由しない → ToolDetail が古いデータのままになる問題を解消する。
 */
export const reauthCompletedSignalAtom = atom<number>(0);
