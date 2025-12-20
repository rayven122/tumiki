import type { Session, User, Account, Profile } from "next-auth";
import type { JWT } from "next-auth/jwt";
import type { Role } from "@tumiki/db/server";
import type { AdapterUser } from "@auth/core/adapters";
import { db } from "@tumiki/db/server";
import type { KeycloakJWTPayload } from "./types";
import { getUserDefaultOrganizationInfo } from "~/server/api/routers/v2/user/getUserDefaultOrganizationInfo";

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

    // DBからdefaultOrganizationInfo を取得
    const orgInfo = await db.$transaction(async (tx) => {
      return await getUserDefaultOrganizationInfo(tx, {
        userId: user.id!,
      });
    });

    if (orgInfo) {
      token.organizationSlug = orgInfo.organizationSlug;
    }
  } else if (token.sub && !token.organizationSlug) {
    // 2回目以降のログイン時: organizationSlugが未設定の場合はDBから取得
    const orgInfo = await db.$transaction(async (tx) => {
      return await getUserDefaultOrganizationInfo(tx, {
        userId: token.sub!,
      });
    });

    if (orgInfo) {
      token.organizationSlug = orgInfo.organizationSlug;
    }
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
    // Keycloak tumikiクレームから組織ロールを取得
    const roles = token.tumiki?.roles ?? [];

    // organizationSlugからorganizationIdを取得
    let organizationId: string | null = token.tumiki?.organization_id ?? null;
    const organizationSlug = token.organizationSlug ?? null;

    if (!organizationId && organizationSlug) {
      // organizationSlugがある場合は、DBからorganizationIdを取得
      const organization = await db.organization.findUnique({
        where: { slug: organizationSlug },
        select: { id: true },
      });
      organizationId = organization?.id ?? null;
    }

    // session.userを新しいオブジェクトとして再構築
    Object.assign(session.user, {
      id: token.sub,
      sub: token.sub,
      email: token.email ?? null,
      name: token.name ?? null,
      image: token.picture ?? null,
      role: token.role ?? "USER",
      organizationSlug: organizationSlug,
      tumiki: token.tumiki ?? null,
      // 既存コードとの互換性のための派生プロパティ
      organizationId: organizationId,
      roles: roles,
      isOrganizationAdmin: roles.some(
        (role) => role === "Owner" || role === "Admin",
      ),
    });
  }
  return session;
};
