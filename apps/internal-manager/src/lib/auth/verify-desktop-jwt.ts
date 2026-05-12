import { createRemoteJWKSet, jwtVerify } from "jose";
import { ensureJacksonOidcClients } from "~/server/jackson/oidc-clients";
import { fetchOidcDiscovery } from "./oidc-utils";
import { z } from "zod";
import { db } from "@tumiki/internal-db/server";

export type VerifiedDesktopUser = {
  sub: string;
  userId: string;
};

// Discovery結果は短時間キャッシュし、IdP設定変更時もプロセス再起動なしで追従する
let cachedJwks: ReturnType<typeof createRemoteJWKSet> | null = null;
let cachedJwksIssuer: string | null = null;
let cachedJwksExpiresAt = 0;
let jwksPromise: Promise<ReturnType<typeof createRemoteJWKSet>> | null = null;
let jwksPromiseIssuer: string | null = null;
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
const getJwks = async (): Promise<ReturnType<typeof createRemoteJWKSet>> => {
  const { OIDC_ISSUER } = await ensureJacksonOidcClients();
  if (
    cachedJwks &&
    cachedJwksIssuer === OIDC_ISSUER &&
    Date.now() < cachedJwksExpiresAt
  ) {
    return cachedJwks;
  }
  if (jwksPromise && jwksPromiseIssuer === OIDC_ISSUER) return jwksPromise;

  const promise = (async () => {
    const config = await fetchOidcDiscovery(OIDC_ISSUER, {
      timeoutMs: OIDC_DISCOVERY_TIMEOUT_MS,
      errorMessage: "OIDCディスカバリ取得失敗",
      invalidResponseMessage: () =>
        "OIDCディスカバリにjwks_uriが含まれていません",
      schema: discoverySchema,
    });

    cachedJwks = createRemoteJWKSet(new URL(config.jwks_uri));
    cachedJwksIssuer = OIDC_ISSUER;
    cachedJwksExpiresAt = Date.now() + JWKS_DISCOVERY_CACHE_TTL_MS;
    return cachedJwks;
  })().finally(() => {
    if (jwksPromise === promise) {
      jwksPromise = null;
      jwksPromiseIssuer = null;
    }
  });
  jwksPromise = promise;
  jwksPromiseIssuer = OIDC_ISSUER;

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
  const { OIDC_ISSUER, OIDC_DESKTOP_CLIENT_ID } =
    await ensureJacksonOidcClients();

  const jwks = await getJwks();
  const { payload } = await jwtVerify(token, jwks, {
    issuer: OIDC_ISSUER,
    audience: OIDC_DESKTOP_CLIENT_ID,
  }).catch(async (error: unknown) => {
    if (!isAudienceValidationError(error)) throw error;
    // Keycloak access_token は aud が "account" 等の内部リソースになり、
    // Desktop client ID の audience 検証に失敗する。この場合だけ issuer 検証後に
    // azp（Authorized Party）が Desktop client ID と一致することを代替条件にする。
    // Desktop が優先送信する id_token は aud が Desktop client ID なので通常パスを通る。
    console.warn(
      "[verifyDesktopJwt] audience検証失敗、azpフォールバックを使用 (access_token?)",
    );
    const result = await jwtVerify(token, jwks, {
      issuer: OIDC_ISSUER,
    });
    // Keycloak access token 専用フォールバック。azp がない IdP は安全側で拒否する。
    if (!result.payload.azp || result.payload.azp !== OIDC_DESKTOP_CLIENT_ID) {
      throw new Error("Desktopトークンのazpが一致しません");
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

  if (identity) {
    return { sub, userId: identity.userId };
  }

  // SCIMプロビジョニング済みユーザーの初回デスクトップログイン対応:
  // ブラウザログイン前にデスクトップアプリでログインした場合、ExternalIdentity（provider=oidc）
  // が未作成のため通常パスで検索できない。
  // JWTのemailクレームでユーザーを特定し、ExternalIdentityをJIT作成してリンクする。
  // JWTは署名・issuer・audience検証済みのため、email一致によるリンクは安全。
  const emailClaim = payload.email;
  const email = typeof emailClaim === "string" ? emailClaim : null;
  if (!email) {
    throw new Error("External identity not found");
  }

  // isActive チェック: SCIMで無効化済みのユーザーはJITリンク不可
  const userByEmail = await db.user.findUnique({
    where: { email },
    select: { id: true, isActive: true },
  });

  if (!userByEmail?.isActive) {
    throw new Error("External identity not found");
  }

  // 初回ログイン時にExternalIdentityを作成（以降は通常パスを通る）
  await db.externalIdentity.upsert({
    where: { provider_sub: { provider: "oidc", sub } },
    create: { userId: userByEmail.id, provider: "oidc", sub },
    update: {},
  });

  return { sub, userId: userByEmail.id };
};
