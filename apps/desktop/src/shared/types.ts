/** OAuth認証セッションのタイムアウト（ミリ秒）。UIとサーバー側で共有 */
export const AUTH_SESSION_TIMEOUT_MS = 5 * 60 * 1000;

export type DesktopProfile = "personal" | "organization";

export type OrganizationProfile = {
  managerUrl: string;
  connectedAt: string;
};

export type ProfileState = {
  activeProfile: DesktopProfile | null;
  organizationProfile: OrganizationProfile | null;
  hasCompletedInitialProfileSetup: boolean;
};

// MCPサーバー型定義
export type McpServer = {
  id: string;
  name: string;
  description: string;
  status: "running" | "stopped" | "error" | "pending";
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
