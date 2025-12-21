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
  // ========================================
  // ケース1: Keycloak初回サインイン
  // 発火条件: account?.provider === "keycloak"
  // ========================================
  if (account?.provider === "keycloak") {
    return await handleKeycloakSignIn(token, account, profile, user);
  }

  // ========================================
  // ケース2: session.update({})による組織切り替え
  // 発火条件: accountなし、token.sub存在、token.tumiki存在
  // ========================================
  if (!account && token.sub && token.tumiki) {
    return await handleSessionUpdate(token);
  }

  // ========================================
  // ケース3: その他（Keycloak以外のプロバイダー、JWTリフレッシュなど）
  // 発火条件: 上記以外
  // ========================================
  // 初回サインイン時はuserオブジェクトが存在する
  if (user) {
    token.sub = user.id!;
    token.role = (user as { role?: Role }).role ?? "USER";
  }

  return token;
};

/**
 * Keycloak初回サインイン時の処理
 * Keycloak access tokenとカスタムクレームをAuth.js JWTに保存
 */
const handleKeycloakSignIn = async (
  token: JWT,
  account: Account,
  profile: Profile | undefined,
  user: User | AdapterUser | undefined,
): Promise<JWT> => {
  // 初回サインイン時のユーザー情報設定
  if (user) {
    token.sub = user.id!;
    token.role = (user as { role?: Role }).role ?? "USER";
  }

  // Keycloak access tokenを保存
  token.accessToken = account.access_token;
  token.expiresAt = account.expires_at;
  token.refreshToken = account.refresh_token;

  // Keycloakプロファイルからカスタムクレームを取得
  const keycloakProfile = profile as KeycloakJWTPayload;
  token.sub = keycloakProfile.sub;
  token.email = keycloakProfile.email ?? null;
  token.name = keycloakProfile.name ?? null;

  // tumikiクレームを取得（初回登録時/既存ユーザー対応）
  const keycloakTumiki = keycloakProfile.tumiki;
  token.tumiki = await getTumikiClaims(
    db,
    token.sub,
    keycloakTumiki?.group_roles,
    keycloakTumiki?.roles,
  );

  return token;
};

/**
 * session.update({})実行時の処理
 * DBから最新のdefaultOrganizationを取得してorg_id/org_slugを更新
 */
const handleSessionUpdate = async (token: JWT): Promise<JWT> => {
  if (!token.sub || !token.tumiki) {
    return token;
  }

  // DBから最新のdefaultOrganizationを取得
  const user = await db.user.findUniqueOrThrow({
    where: { id: token.sub },
    select: {
      defaultOrganization: {
        select: { id: true, slug: true },
      },
    },
  });

  const defaultOrg = user.defaultOrganization;
  if (!defaultOrg) {
    throw new Error(
      `User ${token.sub} does not have a default organization. This should not happen.`,
    );
  }

  // org_idとorg_slugのみ更新、org_slugsとrolesはKeycloakから取得した値を保持
  token.tumiki = {
    ...token.tumiki,
    org_id: defaultOrg.id,
    org_slug: defaultOrg.slug,
  };

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
