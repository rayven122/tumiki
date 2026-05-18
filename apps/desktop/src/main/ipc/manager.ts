import { ipcMain } from "electron";
import { z } from "zod";
import { getAppStore } from "../shared/app-store";
import * as logger from "../shared/utils/logger";
import type { DesktopProfile } from "../../shared/types";

const oidcConfigResponseSchema = z.object({
  issuer: z.string().url(),
  clientId: z.string().min(1),
});

export type OidcConfig = z.infer<typeof oidcConfigResponseSchema>;

const FETCH_TIMEOUT_MS = 10_000;
export const PERSONAL_PROFILE_MANAGER_URL = "https://www.tumiki.cloud";
export const CLOUD_KEYCLOAK_ISSUER =
  process.env.KEYCLOAK_ISSUER || "https://auth.tumiki.cloud/realms/tumiki";
export const CLOUD_KEYCLOAK_DESKTOP_CLIENT_ID =
  process.env.KEYCLOAK_DESKTOP_CLIENT_ID || "tumiki-desktop";

export const isSelfHostedManagerUrl = (managerUrl: string): boolean => {
  const hostname = new URL(managerUrl).hostname;
  return hostname !== "tumiki.cloud" && !hostname.endsWith(".tumiki.cloud");
};

/**
 * internal-manager から組織用 OIDC 設定を取得する。
 * tumiki.cloud 配下は Keycloak に直接接続し、self-host / private tenant のみこの API を使う。
 */
export const fetchManagerOidcConfig = async (
  managerUrl: string,
): Promise<OidcConfig> => {
  const url = `${managerUrl.replace(/\/$/, "")}/api/auth/config`;
  const res = await fetch(url, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) {
    throw new Error(`OIDC設定の取得に失敗しました（${res.status}）`);
  }
  const data: unknown = await res.json();
  return oidcConfigResponseSchema.parse(data);
};

export const resolveManagerOidcConfig = async (
  managerUrl: string,
): Promise<OidcConfig> => {
  if (isSelfHostedManagerUrl(managerUrl)) {
    return fetchManagerOidcConfig(managerUrl);
  }
  return {
    issuer: CLOUD_KEYCLOAK_ISSUER,
    clientId: CLOUD_KEYCLOAK_DESKTOP_CLIENT_ID,
  };
};

/**
 * 管理サーバー連携IPC
 * - manager:getUrl  : 保存済みURL取得
 * - manager:connect : URL検証 → OIDC設定取得 → OAuthManager初期化 → URL保存
 *
 * 組織プロファイルの確定は認証コールバック成功後に行う。
 * connect時点で確定すると、SSO完了前に初期設定ゲートを抜けてしまうため。
 */
export const setupManagerIpc = (
  initOAuthManager: (
    url: string,
    issuer: string,
    clientId: string,
  ) => Promise<void>,
): void => {
  const connectToManager = async (
    url: string,
    pendingProfile: DesktopProfile,
  ): Promise<void> => {
    const normalizedUrl = url.replace(/\/$/, "");
    // manager:connect は組織接続専用のため、個人利用の固定URLは受け付けない。
    if (
      pendingProfile === "organization" &&
      normalizedUrl === PERSONAL_PROFILE_MANAGER_URL
    ) {
      throw new Error(
        "個人利用の場合は「個人利用を始める」ボタンを使用してください",
      );
    }
    const config = await resolveManagerOidcConfig(normalizedUrl);
    await initOAuthManager(normalizedUrl, config.issuer, config.clientId);

    const store = await getAppStore();
    store.set("managerUrl", normalizedUrl);
    store.set("pendingProfile", pendingProfile);

    logger.info("Manager URL connected", {
      url: normalizedUrl,
      pendingProfile,
    });
  };

  ipcMain.handle("manager:getUrl", async () => {
    const store = await getAppStore();
    return store.get("managerUrl") ?? null;
  });

  ipcMain.handle("manager:connect", async (_event, url: unknown) => {
    if (typeof url !== "string") {
      throw new Error("URLは文字列で指定してください");
    }
    try {
      const parsedUrl = new URL(url);
      if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") {
        throw new Error("unsupported protocol");
      }
    } catch {
      throw new Error(
        "管理サーバーURLはhttp://またはhttps://で指定してください",
      );
    }

    await connectToManager(url, "organization");
  });

  ipcMain.handle("manager:connectPersonal", () =>
    connectToManager(PERSONAL_PROFILE_MANAGER_URL, "personal"),
  );
};
