import type { Session, User, Account, Profile } from "next-auth";
import type { JWT } from "next-auth/jwt";
import type { Role } from "@tumiki/db/server";
import type { AdapterUser } from "@auth/core/adapters";
import type { KeycloakJWTPayload, KeycloakTumikiClaims } from "./types";
import { db } from "@tumiki/db/server";
// 循環依存を回避: trpc.ts → ~/auth → callbacks.ts → @/features/user → userRouter → trpc.ts
import { getTumikiClaims } from "@/features/user/api/getTumikiClaims";
import { getKeycloakEnv } from "~/utils/env";
import { decodeJwt } from "jose";

/**
 * Keycloak からアクセストークンをリフレッシュ
 * リフレッシュ失敗時は null を返し、セッションを無効化する
 */
const refreshAccessToken = async (token: JWT): Promise<JWT | null> => {
  const keycloakEnv = getKeycloakEnv();
  const tokenEndpoint = `${keycloakEnv.KEYCLOAK_ISSUER}/protocol/openid-connect/token`;

  try {
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

    const refreshedTokens = (await response.json()) as {
      access_token: string;
      expires_in: number;
      refresh_token?: string;
    };

    // 新しいアクセストークンからKeycloakロールを抽出
    let keycloakRoles: string[] | undefined;
    try {
      const decodedToken = decodeJwt(refreshedTokens.access_token);
      const tumikiClaims = decodedToken.tumiki as
        | KeycloakTumikiClaims
        | undefined;
      keycloakRoles = tumikiClaims?.roles;
    } catch (decodeError) {
      console.warn(
        "[refreshAccessToken] Failed to decode access token for roles:",
        decodeError,
      );
    }

    console.log("[refreshAccessToken] Token refreshed successfully");

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      expiresAt: Math.floor(Date.now() / 1000) + refreshedTokens.expires_in,
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
      keycloakRoles,
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
    token.sub = user.id!;
    token.role = (user as { role?: Role }).role ?? "USER";
  }

  if (account) {
    token.accessToken = account.access_token;
    token.expiresAt = account.expires_at;
    token.refreshToken = account.refresh_token;

    const keycloakProfile = profile as KeycloakJWTPayload;
    token.sub = keycloakProfile.sub;
    token.email = keycloakProfile.email ?? null;
    token.name = keycloakProfile.name ?? null;

    // DBから最新のtumikiクレームを取得
    const updatedTumiki = await getTumikiClaims(
      db,
      token.sub,
      keycloakProfile.tumiki?.roles,
    );

    if (!updatedTumiki) {
      // 組織メンバーシップが見つからない場合はセッションを無効化
      // これにより、ユーザーはサインインページへリダイレクトされる
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
    // トークンリフレッシュ時に取得した最新ロールを優先、なければ既存値を使用
    const roles = token.keycloakRoles ?? token.tumiki.roles;

    // DBから最新のtumikiクレームを取得
    const updatedTumiki = await getTumikiClaims(db, token.sub, roles);

    if (!updatedTumiki) {
      // 組織メンバーシップが見つからない場合はセッションを無効化
      // これにより、ユーザーはサインインページへリダイレクトされる
      console.error(
        `[jwtCallback] Failed to get tumiki claims for user ${token.sub}. Session will be invalidated.`,
      );
      return null;
    }

    token.tumiki = updatedTumiki;
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
