import type { Session, User, Account, Profile } from "next-auth";
import type { JWT } from "next-auth/jwt";
import type { Role } from "@tumiki/db/server";
import type { AdapterUser } from "@auth/core/adapters";
import type { KeycloakJWTPayload } from "./types";
import { db } from "@tumiki/db/server";
import { getTumikiClaims } from "~/server/api/routers/v2/user/getTumikiClaims";

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
}): Promise<JWT> => {
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
      throw new Error(
        `Failed to get tumiki claims for user ${token.sub}. This should not happen.`,
      );
    }

    token.tumiki = updatedTumiki;
    return token;
  }

  if (!account && token.sub && token.tumiki) {
    // DBから最新のtumikiクレームを取得（rolesは既存の値を保持）
    const updatedTumiki = await getTumikiClaims(
      db,
      token.sub,
      token.tumiki.roles,
    );

    if (!updatedTumiki) {
      throw new Error(
        `Failed to get tumiki claims for user ${token.sub}. This should not happen.`,
      );
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
  return session;
};
