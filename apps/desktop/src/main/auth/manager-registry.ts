import type { OAuthManager } from "./oauth-manager";

let oauthManager: OAuthManager | null = null;

/**
 * OAuthManagerを取得
 */
export const getOAuthManager = (): OAuthManager | null => oauthManager;

/**
 * OAuthManagerを設定
 */
export const setOAuthManager = (manager: OAuthManager | null): void => {
  oauthManager = manager;
};
