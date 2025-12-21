import type { Session, User, Account, Profile } from "next-auth";
import type { JWT } from "next-auth/jwt";
import type { Role } from "@tumiki/db/server";
import type { AdapterUser } from "@auth/core/adapters";
import type { KeycloakJWTPayload } from "./types";

/**
 * JWTコールバック
 * Keycloak access tokenとカスタムクレームをAuth.js JWTに保存
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
  // 初回サインイン時（accountが存在する場合）
  if (account?.provider === "keycloak") {
    // Keycloak access tokenを保存
    token.accessToken = account.access_token;
    token.expiresAt = account.expires_at;
    token.refreshToken = account.refresh_token;

    // profileからKeycloakカスタムクレームを取得してそのまま保存
    const keycloakProfile = profile as KeycloakJWTPayload;
    token.sub = keycloakProfile.sub;
    token.email = keycloakProfile.email ?? null;
    token.name = keycloakProfile.name ?? null;
    token.tumiki = keycloakProfile.tumiki ?? null;
  }

  // userオブジェクトが存在する場合（初回サインイン時のみ）
  if (user) {
    token.sub = user.id!;
    token.role = (user as { role?: Role }).role ?? "USER";
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
