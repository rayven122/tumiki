import { db } from "@tumiki/db/tcp";
import { verifyApiKey } from "./apiKey.js";
import type { McpApiKey, UserMcpServerInstance } from "@tumiki/db";

/**
 * Auth0トークンレスポンスの型定義
 */
export interface Auth0TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope?: string;
  refresh_token?: string;
  id_token?: string;
}

/**
 * クライアント認証結果
 */
export interface ClientAuthResult {
  isValid: boolean;
  apiKeyRecord?: McpApiKey & {
    userMcpServerInstance: Pick<
      UserMcpServerInstance,
      "id" | "authType" | "organizationId"
    > | null;
  };
  error?: string;
}

/**
 * OAuthクライアントを認証する
 */
export const authenticateOAuthClient = async (
  clientId: string,
  clientSecret: string,
): Promise<ClientAuthResult> => {
  // McpApiKeyテーブルでクライアント認証
  const apiKeyRecord = await db.mcpApiKey.findFirst({
    where: {
      apiKey: clientId, // clientIdはapiKeyフィールドに保存されている
      isActive: true,
    },
    include: {
      userMcpServerInstance: {
        select: {
          id: true,
          authType: true,
          organizationId: true,
        },
      },
    },
  });

  if (!apiKeyRecord) {
    return {
      isValid: false,
      error: "Client authentication failed: Invalid client_id",
    };
  }

  // client_secretの検証（ハッシュ値と比較）
  const isValidSecret = await verifyApiKey(
    clientSecret,
    apiKeyRecord.apiKeyHash || "",
  );

  if (!isValidSecret) {
    return {
      isValid: false,
      error: "Client authentication failed: Invalid client_secret",
    };
  }

  // authTypeがOAUTHであることを確認
  if (apiKeyRecord.userMcpServerInstance?.authType !== "OAUTH") {
    return {
      isValid: false,
      error: `Server does not support OAuth authentication (authType: ${apiKeyRecord.userMcpServerInstance?.authType})`,
    };
  }

  // 有効期限の確認
  if (apiKeyRecord.expiresAt && apiKeyRecord.expiresAt < new Date()) {
    return {
      isValid: false,
      error: `Client credentials have expired at ${apiKeyRecord.expiresAt.toISOString()}`,
    };
  }

  return {
    isValid: true,
    apiKeyRecord,
  };
};

/**
 * Auth0からM2Mトークンを取得する
 */
export const getAuth0M2MToken = async (
  scope?: string,
): Promise<{ success: boolean; data?: Auth0TokenResponse; error?: string }> => {
  const auth0M2MDomain = process.env.AUTH0_M2M_DOMAIN;
  const auth0M2MClientId = process.env.AUTH0_M2M_CLIENT_ID;
  const auth0M2MClientSecret = process.env.AUTH0_M2M_CLIENT_SECRET;
  const auth0Domain = process.env.AUTH0_DOMAIN;

  if (
    !auth0M2MDomain ||
    !auth0M2MClientId ||
    !auth0M2MClientSecret ||
    !auth0Domain
  ) {
    return {
      success: false,
      error: "Auth0 M2M configuration is missing",
    };
  }

  try {
    const tokenResponse = await fetch(`https://${auth0M2MDomain}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: auth0M2MClientId,
        client_secret: auth0M2MClientSecret,
        audience: `https://${auth0Domain}/api`,
        grant_type: "client_credentials",
        scope: scope || "mcp:access",
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("Failed to get Auth0 M2M token:", errorText);
      return {
        success: false,
        error: "Failed to obtain access token from Auth0",
      };
    }

    const data = (await tokenResponse.json()) as Auth0TokenResponse;
    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error("Auth0 M2M token error:", error);
    return {
      success: false,
      error: "Error communicating with Auth0",
    };
  }
};

/**
 * 最終使用日時を非同期で更新する
 */
export const updateApiKeyLastUsed = (apiKeyId: string): void => {
  db.mcpApiKey
    .update({
      where: { id: apiKeyId },
      data: { lastUsedAt: new Date() },
    })
    .catch((error) => {
      console.error("Failed to update lastUsedAt:", error);
    });
};

/**
 * Auth0の通常クライアント認証情報を取得する
 */
export const getAuth0ClientCredentials = (): {
  clientId: string | undefined;
  clientSecret: string | undefined;
} => {
  return {
    clientId: process.env.AUTH0_CLIENT_ID,
    clientSecret: process.env.AUTH0_CLIENT_SECRET,
  };
};

/**
 * プロキシサーバーのコールバックURLを生成する
 */
export const getProxyCallbackUrl = (): string => {
  const baseUrl = process.env.MCP_PROXY_URL || "http://localhost:8080";
  return `${baseUrl}/oauth/callback`;
};
