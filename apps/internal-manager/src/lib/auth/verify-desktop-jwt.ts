import { createRemoteJWKSet, jwtVerify } from "jose";
import { z } from "zod";
import { getOidcEnv } from "~/lib/env";
import { db } from "@tumiki/internal-db/server";

export type VerifiedDesktopUser = {
  sub: string;
  userId: string;
};

// Discovery結果は短時間キャッシュし、IdP設定変更時もプロセス再起動なしで追従する
let cachedJwks: ReturnType<typeof createRemoteJWKSet> | null = null;
let cachedJwksExpiresAt = 0;
let jwksPromise: Promise<ReturnType<typeof createRemoteJWKSet>> | null = null;
const JWKS_DISCOVERY_CACHE_TTL_MS = 10 * 60 * 1000;
const OIDC_DISCOVERY_TIMEOUT_MS = 5 * 1000;
const discoverySchema = z.object({
  jwks_uri: z.string().url(),
});

const isAudienceValidationError = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  error.code === "ERR_JWT_CLAIM_VALIDATION_FAILED" &&
  "claim" in error &&
  error.claim === "aud";

// OIDCディスカバリ経由でJWKS URIを取得してJWKSクライアントを生成
const getJwks = async () => {
  if (cachedJwks && Date.now() < cachedJwksExpiresAt) return cachedJwks;
  if (jwksPromise) return jwksPromise;

  jwksPromise = (async () => {
    const { OIDC_ISSUER } = getOidcEnv();
    const discoveryUrl = `${OIDC_ISSUER.replace(/\/$/, "")}/.well-known/openid-configuration`;

    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      OIDC_DISCOVERY_TIMEOUT_MS,
    );
    let res: Response;
    try {
      res = await fetch(discoveryUrl, {
        signal: controller.signal,
      });
    } catch {
      throw new Error("OIDCディスカバリ取得失敗");
    } finally {
      clearTimeout(timeoutId);
    }

    if (!res.ok) {
      throw new Error("OIDCディスカバリ取得失敗");
    }

    const config = discoverySchema.safeParse(await res.json());
    if (!config.success) {
      throw new Error("OIDCディスカバリにjwks_uriが含まれていません");
    }

    cachedJwks = createRemoteJWKSet(new URL(config.data.jwks_uri));
    cachedJwksExpiresAt = Date.now() + JWKS_DISCOVERY_CACHE_TTL_MS;
    return cachedJwks;
  })().finally(() => {
    jwksPromise = null;
  });

  return jwksPromise;
};

// DesktopからのBearer JWTを検証し、ユーザーを特定する
export const verifyDesktopJwt = async (
  authHeader: string | null,
): Promise<VerifiedDesktopUser> => {
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Unauthorized");
  }

  const token = authHeader.slice(7);
  const { OIDC_ISSUER, OIDC_CLIENT_ID, OIDC_DESKTOP_CLIENT_ID } = getOidcEnv();

  const expectedClientId = OIDC_DESKTOP_CLIENT_ID ?? OIDC_CLIENT_ID;
  const jwks = await getJwks();
  const { payload } = await jwtVerify(token, jwks, {
    issuer: OIDC_ISSUER,
    audience: expectedClientId,
  }).catch(async (error: unknown) => {
    if (!isAudienceValidationError(error)) throw error;
    // Keycloakのaccess tokenはaudがaccount等の内部リソースになるため、
    // issuer検証後にIdPが付与するazpでDesktopクライアントを確認する。
    const result = await jwtVerify(token, jwks, {
      issuer: OIDC_ISSUER,
    });
    if (result.payload.azp !== expectedClientId) {
      throw new Error("Invalid desktop token client");
    }
    return result;
  });

  const sub = payload.sub;
  if (!sub) {
    throw new Error("Missing token subject");
  }

  // ExternalIdentity経由でユーザーを特定（プロバイダー名はOIDCで固定）
  const identity = await db.externalIdentity.findFirst({
    where: { sub, provider: "oidc" },
    select: { userId: true },
  });

  if (!identity) {
    throw new Error("External identity not found");
  }

  return { sub, userId: identity.userId };
};
