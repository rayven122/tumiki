import type { NextRequest } from "next/server";

import type { OAuthProvider } from "./providers/index.js";
import { OAuthError, TokenFetchError } from "./errors";
import { auth0, managementClient } from "./index.js";
import { PROVIDER_CONNECTIONS } from "./providers/index.js";

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
} from "./providers/index.js";

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
    throw new TokenFetchError(provider, error);
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
      ? await auth0.getSession(request)
      : await auth0.getSession();

    if (!session?.user?.sub) {
      throw new OAuthError("Unauthorized: No session found", provider);
    }

    // ManagementClientを使用してトークンを取得
    const token = await getUserIdentityProviderTokens(
      session.user.sub,
      provider,
    );
    if (!token) {
      throw new OAuthError("No access token found for provider", provider);
    }
    return token;
  } catch (error) {
    if (error instanceof OAuthError) {
      throw error;
    }
    throw new OAuthError("Unknown error occurred", provider, error);
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

  // Auth0の標準ログインエンドポイントを使用
  const params = new URLSearchParams({
    returnTo,
    connection: PROVIDER_CONNECTIONS[provider],
    scope: `openid profile email ${scopes.join(" ")}`,
    // OAuth同意画面を強制的に表示
    prompt: "consent",
  });

  return `/auth/login?${params.toString()}`;
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
    // OAuthErrorの場合は、特定のメッセージの場合のみfalseを返す
    if (error instanceof OAuthError) {
      if (
        error.message.includes("No access token found") ||
        error.message.includes("Unauthorized")
      ) {
        return false;
      }
    }
    if (process.env.NODE_ENV === "development") {
      console.error("Failed to check OAuth connection:", error);
    }
    throw error;
  }
};
