import type { NextRequest } from "next/server";

import { auth0, managementClient } from "./index.js";

export type OAuthProvider =
  | "google"
  | "github"
  | "slack"
  | "notion"
  | "linkedin";

export interface OAuthConfig {
  provider: OAuthProvider;
  scopes: string[];
  connection?: string;
}

/**
 * プロバイダー別のAuth0 connection名マッピング
 */
export const PROVIDER_CONNECTIONS: Record<OAuthProvider, string> = {
  google: "google-oauth2",
  github: "github",
  slack: "slack",
  notion: "notion",
  linkedin: "linkedin",
};

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

    // デバッグ: identity情報を詳細に出力
    if (providerIdentity) {
      console.log(
        "Provider identity found:",
        {
          provider: providerIdentity.provider,
          connection: providerIdentity.connection,
          hasAccessToken: !!providerIdentity.access_token,
          // profileDataにスコープ情報が含まれる場合がある
          profileData: providerIdentity.profileData,
        },
        providerIdentity,
      );
    }

    return providerIdentity?.access_token || null;
  } catch (error) {
    console.error("Failed to get provider access token:", error);
    return null;
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
      return null;
    }

    // ManagementClientを使用してトークンを取得
    return await getUserIdentityProviderTokens(session.user.sub, provider);
  } catch (error) {
    console.error("Failed to get provider access token:", error);
    return null;
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
    console.error("Failed to check OAuth connection:", error);
    return false;
  }
};

/**
 * プロバイダー設定情報
 */
export const PROVIDER_CONFIGS = {
  google: {
    name: "Google",
    icon: "🔍",
    availableScopes: [
      {
        id: "drive-read",
        label: "Google Drive（読み取り）",
        description: "ファイルの閲覧",
        scopes: ["https://www.googleapis.com/auth/drive.readonly"],
      },
      {
        id: "drive-write",
        label: "Google Drive（書き込み）",
        description: "ファイルの作成・編集",
        scopes: ["https://www.googleapis.com/auth/drive.file"],
      },
      {
        id: "calendar",
        label: "カレンダー",
        description: "カレンダーイベントの管理",
        scopes: ["https://www.googleapis.com/auth/calendar"],
      },
      {
        id: "gmail",
        label: "Gmail",
        description: "メールの読み取り",
        scopes: ["https://www.googleapis.com/auth/gmail.readonly"],
      },
    ],
  },
  github: {
    name: "GitHub",
    icon: "🐙",
    availableScopes: [
      {
        id: "repo",
        label: "リポジトリ",
        description: "リポジトリの読み書き",
        scopes: ["repo"],
      },
      {
        id: "gist",
        label: "Gist",
        description: "Gistの管理",
        scopes: ["gist"],
      },
      {
        id: "org",
        label: "組織",
        description: "組織の管理",
        scopes: ["read:org", "admin:org"],
      },
    ],
  },
  slack: {
    name: "Slack",
    icon: "💬",
    availableScopes: [
      {
        id: "channels",
        label: "チャンネル",
        description: "チャンネル情報の読み取り",
        scopes: ["channels:read", "groups:read"],
      },
      {
        id: "chat",
        label: "メッセージ",
        description: "メッセージの送信",
        scopes: ["chat:write"],
      },
      {
        id: "users",
        label: "ユーザー",
        description: "ユーザー情報の読み取り",
        scopes: ["users:read", "users:read.email"],
      },
    ],
  },
  notion: {
    name: "Notion",
    icon: "📝",
    availableScopes: [
      {
        id: "read",
        label: "読み取り",
        description: "ページとデータベースの読み取り",
        scopes: ["read_content"],
      },
      {
        id: "write",
        label: "書き込み",
        description: "ページとデータベースの編集",
        scopes: ["insert_content", "update_content"],
      },
    ],
  },
  linkedin: {
    name: "LinkedIn",
    icon: "💼",
    availableScopes: [
      {
        id: "profile",
        label: "プロフィール",
        description: "プロフィール情報",
        scopes: ["r_liteprofile", "r_emailaddress"], // cspell:disable-line
      },
      {
        id: "share",
        label: "投稿",
        description: "投稿の作成",
        scopes: ["w_member_social"],
      },
    ],
  },
} as const;
