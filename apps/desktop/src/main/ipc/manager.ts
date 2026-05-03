import { ipcMain } from "electron";
import { z } from "zod";
import { getAppStore } from "../shared/app-store";
import * as logger from "../shared/utils/logger";

const oidcConfigResponseSchema = z.object({
  issuer: z.string().url(),
  clientId: z.string().min(1),
});

export type OidcConfig = z.infer<typeof oidcConfigResponseSchema>;

const FETCH_TIMEOUT_MS = 10_000;

/**
 * 管理サーバーからOIDC設定を取得する
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
  ipcMain.handle("manager:getUrl", async () => {
    const store = await getAppStore();
    return store.get("managerUrl") ?? null;
  });

  ipcMain.handle("manager:connect", async (_event, url: unknown) => {
    if (typeof url !== "string") {
      throw new Error("URLは文字列で指定してください");
    }
    try {
      new URL(url);
    } catch {
      throw new Error("無効なURLです");
    }

    const config = await fetchManagerOidcConfig(url);
    await initOAuthManager(url, config.issuer, config.clientId);

    const store = await getAppStore();
    store.set("managerUrl", url);

    logger.info("Manager URL connected", { url });
  });
};
