import { createRemoteJWKSet, jwtVerify } from "jose";
import { getOidcEnv } from "~/lib/env";
import { db } from "@tumiki/internal-db/server";

export type VerifiedDesktopUser = {
  sub: string;
  userId: string;
};

// Discovery結果は短時間キャッシュし、IdP設定変更時もプロセス再起動なしで追従する
let cachedJwks: ReturnType<typeof createRemoteJWKSet> | null = null;
let cachedJwksExpiresAt = 0;
const JWKS_DISCOVERY_CACHE_TTL_MS = 10 * 60 * 1000;

/**
 * OIDCディスカバリ経由でJWKS URIを取得してJWKSクライアントを生成
 * EntraID / Okta / Google / Keycloak など任意のOIDCプロバイダーに対応
 */
const getJwks = async () => {
  if (cachedJwks && Date.now() < cachedJwksExpiresAt) return cachedJwks;

  const { OIDC_ISSUER } = getOidcEnv();
  const discoveryUrl = `${OIDC_ISSUER.replace(/\/$/, "")}/.well-known/openid-configuration`;

  const res = await fetch(discoveryUrl);
  if (!res.ok) {
    throw new Error(`OIDCディスカバリ取得失敗: ${res.status}`);
  }

  const config = (await res.json()) as { jwks_uri?: string };
  if (!config.jwks_uri) {
    throw new Error("OIDCディスカバリにjwks_uriが含まれていません");
  }

  cachedJwks = createRemoteJWKSet(new URL(config.jwks_uri));
  cachedJwksExpiresAt = Date.now() + JWKS_DISCOVERY_CACHE_TTL_MS;
  return cachedJwks;
};

/**
 * DesktopからのBearer JWTを検証し、ユーザーを特定する
 *
 * @param authHeader Authorization ヘッダー値（"Bearer <token>"形式）
 */
export const verifyDesktopJwt = async (
  authHeader: string | null,
): Promise<VerifiedDesktopUser> => {
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Unauthorized");
  }

  const token = authHeader.slice(7);
  const { OIDC_ISSUER, OIDC_CLIENT_ID } = getOidcEnv();

  const jwks = await getJwks();
  const { payload } = await jwtVerify(token, jwks, {
    issuer: OIDC_ISSUER,
    audience: OIDC_CLIENT_ID,
  });

  const sub = payload.sub;
  if (!sub) {
    throw new Error("Invalid token: missing sub claim");
  }

  // ExternalIdentity経由でユーザーを特定（プロバイダー名はOIDCで固定）
  const identity = await db.externalIdentity.findFirst({
    where: { sub, provider: "oidc" },
    select: { userId: true },
  });

  if (!identity) {
    throw new Error("User not found");
  }

  return { sub, userId: identity.userId };
};
