import type { Session, User, Account, Profile } from "next-auth";
import type { JWT } from "next-auth/jwt";
import type { Role } from "@tumiki/db/server";
import type { AdapterUser } from "@auth/core/adapters";
import type { KeycloakJWTPayload } from "./types";
import { db } from "@tumiki/db/server";
import { getTumikiClaims } from "~/server/api/routers/v2/user/getTumikiClaims";

/**
 * JWTコールバック
 * Keycloak access tokenとカスタムクレームをAuth.js JWTに保存
 * Keycloakクレームを内部使用形式に変換
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
  // userオブジェクトが存在する場合（初回サインイン時のみ）
  if (user) {
    token.sub = user.id!;
    token.role = (user as { role?: Role }).role ?? "USER";
  }

  // Keycloak以外のプロバイダーの場合は早期return
  if (account?.provider !== "keycloak") {
    return token;
  }

  // Keycloak access tokenを保存
  token.accessToken = account.access_token;
  token.expiresAt = account.expires_at;
  token.refreshToken = account.refresh_token;

  // profileからKeycloakカスタムクレームを取得
  const keycloakProfile = profile as KeycloakJWTPayload;
  token.sub = keycloakProfile.sub;
  token.email = keycloakProfile.email ?? null;
  token.name = keycloakProfile.name ?? null;

  const keycloakTumiki = keycloakProfile.tumiki;

  // tumikiクレームを取得（DB/Keycloakアクセスロジックはserver側に委譲）
  token.tumiki = await getTumikiClaims(
    db,
    token.sub,
    keycloakTumiki?.group_roles,
    keycloakTumiki?.roles,
  );

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
