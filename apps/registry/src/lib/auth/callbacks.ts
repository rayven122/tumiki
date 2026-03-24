import type { Session, User, Account, Profile } from "next-auth";
import type { JWT } from "next-auth/jwt";
import type { Role } from "@tumiki/db/server";
import type { AdapterUser } from "@auth/core/adapters";
import { db } from "@tumiki/db/server";
import { getTumikiClaims } from "./get-tumiki-claims";
import { getKeycloakEnv } from "~/lib/env";
import { decodeJwt } from "jose";
import { z } from "zod";

// Keycloak JWTペイロードのZodスキーマ（unsafe キャストを排除するためのバリデーション用）
const keycloakTumikiClaimsSchema = z.object({
  group_roles: z.array(z.string()),
  roles: z.array(z.string()),
});

const keycloakJWTPayloadSchema = z.object({
  sub: z.string().optional(),
  email: z.string().optional(),
  name: z.string().optional(),
  tumiki: keycloakTumikiClaimsSchema.optional(),
});

// トークンリフレッシュレスポンスのZodスキーマ
const refreshedTokensSchema = z.object({
  access_token: z.string(),
  expires_in: z.number(),
  refresh_token: z.string().optional(),
});

/**
 * Keycloak からアクセストークンをリフレッシュ
 * リフレッシュ失敗時は null を返し、セッションを無効化する
 */
const refreshAccessToken = async (token: JWT): Promise<JWT | null> => {
  try {
    const keycloakEnv = getKeycloakEnv();
    const tokenEndpoint = `${keycloakEnv.KEYCLOAK_ISSUER}/protocol/openid-connect/token`;

    const response = await fetch(tokenEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: keycloakEnv.KEYCLOAK_CLIENT_ID,
        client_secret: keycloakEnv.KEYCLOAK_CLIENT_SECRET,
        refresh_token: token.refreshToken ?? "",
      }),
    });

    if (!response.ok) {
      console.error(
        `[refreshAccessToken] Failed to refresh token: ${response.status} ${response.statusText}`,
      );
      return null;
    }

    const refreshedTokens = refreshedTokensSchema.parse(await response.json());

    // 新しいアクセストークンからKeycloakのgroup_rolesを抽出
    let keycloakGroupRoles: string[] | undefined;
    try {
      const decodedToken = keycloakJWTPayloadSchema.parse(
        decodeJwt(refreshedTokens.access_token),
      );
      keycloakGroupRoles = decodedToken.tumiki?.group_roles;
    } catch (decodeError) {
      console.warn(
        "[refreshAccessToken] Failed to decode access token for group_roles:",
        decodeError,
      );
    }

    console.log("[refreshAccessToken] Token refreshed successfully");

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      expiresAt: Math.floor(Date.now() / 1000) + refreshedTokens.expires_in,
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
      keycloakGroupRoles,
    };
  } catch (error) {
    console.error("[refreshAccessToken] Error refreshing token:", error);
    return null;
  }
};

/**
 * JWTコールバック
 *
 * 発火タイミング：
 * 1. 初回サインイン時（account存在、Keycloakからプロファイル取得）
 * 2. session.update({})実行時（accountなし、既存tokenを更新）
 * 3. JWTリフレッシュ時（定期的な更新）
 */
export const jwtCallback = async ({
  token,
  account,
  profile,
  user,
}: {
  token: JWT;
  account?: Account | null;
  profile?: Profile;
  user?: User | AdapterUser;
}): Promise<JWT | null> => {
  if (user) {
    token.sub = user.id ?? user.email ?? "";
    token.role = (user as { role?: Role }).role ?? "USER";
  }

  if (account) {
    token.accessToken = account.access_token;
    token.expiresAt = account.expires_at;
    token.refreshToken = account.refresh_token;

    const keycloakProfile = keycloakJWTPayloadSchema.parse(profile);
    token.sub = keycloakProfile.sub ?? "";
    token.email = keycloakProfile.email ?? null;
    token.name = keycloakProfile.name ?? null;

    // DBから最新のtumikiクレームを取得（group_rolesから組織別ロールを解析）
    const updatedTumiki = await getTumikiClaims(
      db,
      token.sub,
      keycloakProfile.tumiki?.group_roles,
    );

    if (!updatedTumiki) {
      // ユーザーが見つからない場合はセッションを無効化
      console.error(
        `[jwtCallback] Failed to get tumiki claims for user ${token.sub}. Session will be invalidated.`,
      );
      return null;
    }

    token.tumiki = updatedTumiki;
    return token;
  }

  // アクセストークンの有効期限をチェック（60秒のバッファを持たせる）
  const shouldRefresh = token.expiresAt
    ? Date.now() >= (token.expiresAt - 60) * 1000
    : false;

  if (shouldRefresh && token.refreshToken) {
    const refreshedToken = await refreshAccessToken(token);

    if (!refreshedToken) {
      // リフレッシュ失敗 → セッション無効化（サインインページへリダイレクト）
      console.error("[jwtCallback] Token refresh failed, invalidating session");
      return null;
    }

    token = refreshedToken;
  }

  if (!account && token.sub && token.tumiki) {
    // セッション更新（update({})）またはトークンリフレッシュ時
    // Keycloakからアクセストークンをリフレッシュして最新のgroup_rolesを取得
    const userId = token.sub; // subは上の条件でチェック済み
    let groupRoles = token.keycloakGroupRoles ?? token.tumiki.group_roles;

    // session.update({})時のみリフレッシュを実行（forceRefreshフラグで制御）
    // shouldRefreshが既にtrueで上でリフレッシュ済みの場合はスキップ（ダブルリフレッシュ防止）
    if (token.refreshToken && !shouldRefresh && token.forceRefresh) {
      const refreshedToken = await refreshAccessToken(token);
      if (refreshedToken) {
        token = { ...refreshedToken, forceRefresh: false };
        // リフレッシュで取得した最新のgroup_rolesを使用
        groupRoles = token.keycloakGroupRoles ?? groupRoles;
      }
    }

    const updatedTumiki = await getTumikiClaims(db, userId, groupRoles);

    if (!updatedTumiki) {
      // ユーザーが見つからない場合はセッションを無効化
      console.error(
        `[jwtCallback] Failed to get tumiki claims for user ${token.sub}. Session will be invalidated.`,
      );
      return null;
    }

    token.tumiki = updatedTumiki;
    // 使用済みのkeycloakGroupRolesをクリア
    token.keycloakGroupRoles = undefined;
    return token;
  }

  return token;
};

/**
 * セッションコールバック
 * JWTトークンからクライアントに返すセッション情報を構築
 */
export const sessionCallback = async ({
  session,
  token,
}: {
  session: Session;
  token: JWT;
}): Promise<Session> => {
  if (session.user && token?.sub) {
    // session.userを新しいオブジェクトとして再構築
    Object.assign(session.user, {
      id: token.sub,
      sub: token.sub,
      email: token.email ?? null,
      name: token.name ?? null,
      image: token.picture ?? null,
      role: token.role ?? "USER",
      tumiki: token.tumiki ?? null, // Keycloakカスタムクレーム（組織情報を含む）
    });
  }
  // MCP Proxy認証用にaccessTokenを公開
  session.accessToken = token.accessToken;
  return session;
};
