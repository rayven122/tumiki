import { createRemoteJWKSet, jwtVerify } from "jose";
import { z } from "zod";
import { db } from "@tumiki/db/server";
import { getKeycloakEnv } from "~/lib/env";

export type VerifiedDesktopUser = {
  sub: string;
  userId: string;
  orgSlug: string | null;
};

// Keycloak group_roles の形式: "/org-slug/ROLE_NAME"
const parseOrgSlugFromGroupRoles = (groupRoles: string[]): string | null => {
  for (const role of groupRoles) {
    const match = /^\/([^/@][^/]*)\//.exec(role);
    if (match?.[1]) return match[1];
  }
  return null;
};

// Keycloak access_token の aud クレームは通常 "account" を含む
// azp フォールバック時にこの値で絞り込むことで、同一 realm 内の
// 別クライアントのトークンを誤受け入れしないようにする
const KEYCLOAK_ACCESS_TOKEN_AUDIENCE = "account";

const tumikiClaimSchema = z
  .object({ group_roles: z.array(z.string()).optional() })
  .optional();

// jose の createRemoteJWKSet は内部で JWKS をキャッシュするため TTL 管理は不要
// サーバーレス環境ではコールドスタートごとに再初期化されるが、ウォームインスタンスでは再利用される。
// 注意: モジュールスコープでキャッシュするため、KEYCLOAK_ISSUER を実行中に変更しても
// プロセス再起動まで反映されない。テストでは jose 全体を vi.mock するためキャッシュ実害なし。
let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

const getJwks = () => {
  if (!jwks) {
    const env = getKeycloakEnv();
    jwks = createRemoteJWKSet(
      new URL(`${env.KEYCLOAK_ISSUER}/protocol/openid-connect/certs`),
    );
  }
  return jwks;
};

const isAudienceValidationError = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  error.code === "ERR_JWT_CLAIM_VALIDATION_FAILED" &&
  "claim" in error &&
  error.claim === "aud";

/**
 * Desktop からの Bearer JWT を検証してユーザーを特定する
 *
 * Desktop は id_token を優先送信するが、access_token の場合は
 * aud が "account" 等になるため azp フォールバックで検証する。
 * フォールバック時は aud に "account" が含まれることも確認し、
 * 同一 realm の別クライアントのトークン誤受け入れを防ぐ。
 */
export const verifyDesktopJwt = async (
  authHeader: string | null,
): Promise<VerifiedDesktopUser> => {
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Unauthorized");
  }

  const token = authHeader.slice(7);
  // "Bearer " のみで token 部分が空のケースを明示的に弾く
  if (!token) throw new Error("Unauthorized");

  const env = getKeycloakEnv();
  const jwks = getJwks();

  const { payload } = await jwtVerify(token, jwks, {
    issuer: env.KEYCLOAK_ISSUER,
    audience: env.KEYCLOAK_CLIENT_ID,
  }).catch(async (error: unknown) => {
    if (!isAudienceValidationError(error)) throw error;

    // access_token の aud 検証失敗時は azp + Keycloak 標準 aud でフォールバック
    const result = await jwtVerify(token, jwks, {
      issuer: env.KEYCLOAK_ISSUER,
      audience: KEYCLOAK_ACCESS_TOKEN_AUDIENCE,
    });
    if (result.payload.azp !== env.KEYCLOAK_CLIENT_ID) {
      throw new Error("Desktopトークンのazpが一致しません");
    }
    return result;
  });

  const sub = payload.sub;
  if (!sub) throw new Error("JWTにsubが含まれていません");

  // tumiki カスタムクレームから org slug を安全に抽出（Zod でランタイム検証）
  const tumikiParse = tumikiClaimSchema.safeParse(payload.tumiki);
  const orgSlug = tumikiParse.success
    ? parseOrgSlugFromGroupRoles(tumikiParse.data?.group_roles ?? [])
    : null;

  // Auth.js の Account テーブル経由で User.id を取得
  const account = await db.account.findUnique({
    where: {
      provider_providerAccountId: {
        provider: "keycloak",
        providerAccountId: sub,
      },
    },
    select: { userId: true },
  });

  // ユーザー登録状況の列挙を防ぐため Unauthorized で統一
  if (!account) throw new Error("Unauthorized");

  return { sub, userId: account.userId, orgSlug };
};
