// electron-store v11 は ESM のみのため動的 import で初期化する
import type Store from "electron-store";
import type { DesktopProfile, OrganizationProfile } from "../../shared/types";

// AI コーディングツールのテレメトリ設定（ツール単位）
type AiCodingTelemetryToolSetting = {
  // テレメトリ収集を有効にするか
  enabled: boolean;
  // 最後に設定ファイルへ書き込んだ ISO 日時
  appliedAt?: string;
  // 書き込み時のポート番号
  appliedPort?: number;
};

type AppStoreSchema = {
  installationId?: string;
  managerUrl?: string;
  activeProfile?: DesktopProfile;
  organizationProfile?: OrganizationProfile;
  hasCompletedInitialProfileSetup?: boolean;
  // AI コーディングツール テレメトリ設定
  aiCodingTelemetry?: {
    tools: {
      "claude-code"?: AiCodingTelemetryToolSetting;
      codex?: AiCodingTelemetryToolSetting;
    };
  };
};

let storeInstance: Store<AppStoreSchema> | null = null;

export const getAppStore = async (): Promise<Store<AppStoreSchema>> => {
  if (!storeInstance) {
    const { default: StoreClass } = await import("electron-store");
    storeInstance = new StoreClass<AppStoreSchema>();
  }
  return storeInstance;
};
