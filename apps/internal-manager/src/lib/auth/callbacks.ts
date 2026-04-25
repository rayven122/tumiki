import type { Session, User, Account, Profile } from "next-auth";
import type { JWT } from "next-auth/jwt";
import type { Role } from "@tumiki/db/server";
import type { AdapterUser } from "@auth/core/adapters";
import { db } from "@tumiki/db/server";
import { getTumikiClaims } from "./get-tumiki-claims";
import { getOidcEnv } from "~/lib/env";
import { decodeJwt } from "jose";
import { z } from "zod";

// OIDCアクセストークンのペイロードスキーマ
const tumikiIdpClaimsSchema = z.object({
  group_roles: z.array(z.string()),
  roles: z.array(z.string()),
});

const oidcJWTPayloadSchema = z.object({
  sub: z.string().optional(),
  email: z.string().optional(),
  name: z.string().optional(),
  tumiki: tumikiIdpClaimsSchema.optional(),
});

// トークンリフレッシュレスポンスのスキーマ
const refreshedTokensSchema = z.object({
  access_token: z.string(),
  expires_in: z.number(),
  refresh_token: z.string().optional(),
});

// OIDCディスカバリーからトークンエンドポイントを取得（issuerをキーにキャッシュ）
const tokenEndpointCache = new Map<string, string>();

const getTokenEndpoint = async (issuer: string): Promise<string> => {
  const cached = tokenEndpointCache.get(issuer);
  if (cached) return cached;

  const discoveryUrl = `${issuer.replace(/\/$/, "")}/.well-known/openid-configuration`;
  const res = await fetch(discoveryUrl);
  if (!res.ok) throw new Error(`OIDC discovery failed: ${res.status}`);

  const config = z
    .object({ token_endpoint: z.string().url() })
    .parse(await res.json());

  tokenEndpointCache.set(issuer, config.token_endpoint);
  return config.token_endpoint;
};

/**
 * OIDCアクセストークンをリフレッシュ
 * トークンエンドポイントはOIDCディスカバリーで自動取得（Entra/GWS/Okta/Keycloak共通）
 */
const refreshAccessToken = async (token: JWT): Promise<JWT | null> => {
  if (!token.refreshToken) return null;

  try {
    const { OIDC_CLIENT_ID, OIDC_CLIENT_SECRET, OIDC_ISSUER } = getOidcEnv();
    const tokenEndpoint = await getTokenEndpoint(OIDC_ISSUER);

    const response = await fetch(tokenEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: OIDC_CLIENT_ID,
        client_secret: OIDC_CLIENT_SECRET,
        refresh_token: token.refreshToken,
      }),
    });

    if (!response.ok) {
      console.error(
        `[refreshAccessToken] Failed: ${response.status} ${response.statusText}`,
      );
      return null;
    }

    const refreshed = refreshedTokensSchema.parse(await response.json());

    // 新しいアクセストークンからTumikiカスタムクレームを抽出（プロバイダーが対応している場合）
    let idpGroupRoles: string[] | undefined;
    try {
      const decoded = oidcJWTPayloadSchema.parse(
        decodeJwt(refreshed.access_token),
      );
      idpGroupRoles = decoded.tumiki?.group_roles;
    } catch {
      // カスタムクレームがない場合は無視（DBから取得）
    }

    return {
      ...token,
      accessToken: refreshed.access_token,
      expiresAt: Math.floor(Date.now() / 1000) + refreshed.expires_in,
      refreshToken: refreshed.refresh_token ?? token.refreshToken,
      idpGroupRoles,
    };
  } catch (error) {
    console.error("[refreshAccessToken] Error:", error);
    return null;
  }
};

/**
 * JWTコールバック
 *
 * 発火タイミング：
 * 1. 初回サインイン時（account存在、OIDCプロバイダーからプロファイル取得）
 * 2. session.update({})実行時
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

    const profileResult = oidcJWTPayloadSchema.safeParse(profile);
    if (!profileResult.success) {
      console.error("[jwtCallback] Invalid OIDC profile:", profileResult.error);
      return null;
    }
    const oidcProfile = profileResult.data;
    token.sub = oidcProfile.sub ?? "";
    token.email = oidcProfile.email ?? null;
    token.name = oidcProfile.name ?? null;

    // group_rolesはOIDCプロバイダーのカスタムクレームから取得（未設定の場合は空配列）
    const groupRoles = oidcProfile.tumiki?.group_roles;

    const updatedTumiki = await getTumikiClaims(db, token.sub, groupRoles);

    if (!updatedTumiki) {
      console.error(
        `[jwtCallback] User not found: ${token.sub}. Session will be invalidated.`,
      );
      return null;
    }

    token.tumiki = updatedTumiki;
    return token;
  }

  // アクセストークンの有効期限チェック（60秒バッファ）
  const shouldRefresh = token.expiresAt
    ? Date.now() >= (token.expiresAt - 60) * 1000
    : false;

  if (shouldRefresh && token.refreshToken) {
    const refreshedToken = await refreshAccessToken(token);
    if (!refreshedToken) {
      console.error("[jwtCallback] Token refresh failed, invalidating session");
      return null;
    }
    token = refreshedToken;
  }

  if (!account && token.sub && token.tumiki) {
    const userId = token.sub;
    let groupRoles = token.idpGroupRoles ?? token.tumiki.group_roles;

    // session.update({})時のみ強制リフレッシュ
    if (token.refreshToken && !shouldRefresh && token.forceRefresh) {
      const refreshedToken = await refreshAccessToken(token);
      if (refreshedToken) {
        token = { ...refreshedToken, forceRefresh: false };
        groupRoles = token.idpGroupRoles ?? groupRoles;
      }
    }

    const updatedTumiki = await getTumikiClaims(db, userId, groupRoles);

    if (!updatedTumiki) {
      console.error(
        `[jwtCallback] User not found: ${token.sub}. Session will be invalidated.`,
      );
      return null;
    }

    token.tumiki = updatedTumiki;
    token.idpGroupRoles = undefined;
    return token;
  }

  return token;
};

/**
 * セッションコールバック
 */
export const sessionCallback = async ({
  session,
  token,
}: {
  session: Session;
  token: JWT;
}): Promise<Session> => {
  if (session.user && token?.sub) {
    Object.assign(session.user, {
      id: token.sub,
      sub: token.sub,
      email: token.email ?? null,
      name: token.name ?? null,
      image: token.picture ?? null,
      role: token.role ?? "USER",
      tumiki: token.tumiki ?? null,
    });
  }
  session.accessToken = token.accessToken;
  return session;
};
