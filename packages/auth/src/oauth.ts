import type { NextRequest } from "next/server";

import type { OAuthProvider } from "./providers.js";
import { auth0OAuth, managementClient } from "./clients.js";
import { createOAuthError, OAuthError, OAuthErrorCode } from "./errors.js";
import { PROVIDER_CONNECTIONS } from "./providers.js";

export interface OAuthConfig {
  provider: OAuthProvider;
  scopes: string[];
  connection?: string;
}

// Re-export types and constants from providers
export {
  type OAuthProvider,
  PROVIDER_CONNECTIONS,
  OAUTH_PROVIDERS,
} from "./providers.js";

/**
 * ManagementClientを使用してユーザーのIDプロバイダートークンを取得
 * @param userId ユーザーID
 * @param provider OAuthプロバイダー名
 * @returns アクセストークンまたはnull
 */
export const getUserIdentityProviderTokens = async (
  userId: string,
  provider: OAuthProvider,
): Promise<string | null> => {
  try {
    // ManagementClientを使用してユーザーの完全なプロファイルを取得
    const user = await managementClient.users.get({
      id: userId,
      fields: "identities",
      include_fields: true,
    });

    // プロバイダーのconnection名を取得
    const connectionName = PROVIDER_CONNECTIONS[provider];

    // identitiesからプロバイダーのアクセストークンを探す
    const providerIdentity = user.data.identities?.find(
      (identity) => identity.connection === connectionName,
    );

    return providerIdentity?.access_token || null;
  } catch (error) {
    throw createOAuthError(OAuthErrorCode.CONNECTION_FAILED, provider, error);
  }
};

/**
 * プロバイダー別のアクセストークンを取得
 * @param provider OAuthプロバイダー名
 * @param request NextRequest
 * @returns アクセストークンまたはnull
 */
export const getProviderAccessToken = async (
  provider: OAuthProvider,
  request?: NextRequest,
): Promise<string | null> => {
  try {
    // Auth0からセッションを取得
    const session = request
      ? await auth0OAuth.getSession(request)
      : await auth0OAuth.getSession();

    if (!session?.user?.sub) {
      throw createOAuthError(OAuthErrorCode.UNAUTHORIZED, provider);
    }

    // ManagementClientを使用してトークンを取得
    const token = await getUserIdentityProviderTokens(
      session.user.sub,
      provider,
    );
    if (!token) {
      throw createOAuthError(OAuthErrorCode.NO_ACCESS_TOKEN, provider);
    }
    return token;
  } catch (error) {
    if (error instanceof Error && error.name === "OAuthError") {
      throw error;
    }
    throw createOAuthError(OAuthErrorCode.UNKNOWN_ERROR, provider, error);
  }
};

/**
 * スコープを指定してOAuth認証フローを開始
 * @param config OAuth設定
 * @param returnTo リダイレクト先URL
 * @returns ログインURL
 */
export const startOAuthFlow = async (
  config: OAuthConfig,
  returnTo = "/mcp",
): Promise<string> => {
  const { provider, scopes } = config;

  // OAuth専用のログインエンドポイントを使用
  const params = new URLSearchParams({
    returnTo,
    connection: PROVIDER_CONNECTIONS[provider],
    scope: `openid profile email ${scopes.join(" ")}`,
    prompt: "consent", // 各SaaSの同意画面を必ず表示
  });

  return `/oauth/auth/login?${params.toString()}`;
};

/**
 * ユーザーのOAuth接続ステータスを確認
 * @param userId ユーザーID
 * @param provider プロバイダー名
 * @returns 接続済みかどうか
 */
export const checkOAuthConnection = async (
  provider: OAuthProvider,
  request?: NextRequest,
): Promise<boolean> => {
  try {
    const token = await getProviderAccessToken(provider, request);
    return !!token;
  } catch (error) {
    // OAuthErrorの場合は、NO_ACCESS_TOKENまたはUNAUTHORIZEDの場合のみfalseを返す
    if (error instanceof OAuthError) {
      if (
        error.code === OAuthErrorCode.NO_ACCESS_TOKEN ||
        error.code === OAuthErrorCode.UNAUTHORIZED
      ) {
        return false;
      }
    }
    throw error;
  }
};
