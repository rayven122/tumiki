import { PrismaAdapter } from "@auth/prisma-adapter";
import { db, type Role } from "@tumiki/db/server";
import NextAuth from "next-auth";
import type { Session } from "next-auth";
import type { JWT } from "next-auth/jwt";
import Keycloak from "next-auth/providers/keycloak";
import { getKeycloakEnv } from "~/utils/env";

// Re-export verification utilities
export { isVerificationModeEnabled } from "~/lib/verification";

/**
 * セッション型定義
 */
export type SessionReturnType = Session | null;

/**
 * SessionData型 - Keycloak互換の型エイリアス
 * @deprecated Session型を直接使用してください
 */
export type SessionData = Session;

/**
 * Keycloak JWTペイロード型定義
 */
type KeycloakJWTPayload = {
  sub: string;
  email?: string;
  name?: string;
  tumiki?: {
    organization_id: string;
    organization_group: string;
    roles: string[];
  };
};

/**
 * Keycloak Profileコールバック用の型定義
 */
type KeycloakProfile = KeycloakJWTPayload & {
  picture?: string;
};

const keycloakEnv = getKeycloakEnv();

/**
 * Auth.js メイン設定
 * JWT戦略でKeycloak access tokenを保持
 */
export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  providers: [
    Keycloak({
      clientId: keycloakEnv.KEYCLOAK_CLIENT_ID,
      clientSecret: keycloakEnv.KEYCLOAK_CLIENT_SECRET,
      issuer: keycloakEnv.KEYCLOAK_ISSUER,
      authorization: {
        params: {
          // Keycloakのログイン画面をスキップして直接Googleにリダイレクト
          kc_idp_hint: "google",
          // Googleのアカウント選択画面を常に表示
          // prompt: アカウント選択を強制
          // max_age: 認証の有効期限を0にして常に再認証を要求
          prompt: "select_account",
          max_age: "0",
        },
      },
      profile: (profile: KeycloakProfile) => {
        // Keycloakのカスタムクレーム（tumiki）を抽出
        // Auth.js User型に準拠するため、role, defaultOrganization, tumikiを含める
        return {
          id: profile.sub,
          email: profile.email ?? null,
          name: profile.name ?? null,
          image: profile.picture ?? null,
          role: "USER" as const, // デフォルト値（実際にはDBから取得）
          defaultOrganization: null, // 初回サインイン時はnull
          // Keycloakのカスタムクレームも含める
          tumiki: profile.tumiki ?? null,
        };
      },
    }),
  ],
  pages: {
    signIn: "/signin",
  },
  adapter: {
    ...PrismaAdapter(db),
    createUser: async (user) => {
      // emailの検証（必須フィールド）
      if (!user.email) {
        throw new Error(
          "Email is required for user creation. Keycloak must be configured to provide email.",
        );
      }

      // ユーザーと個人を作成
      const { createUserWithOrganization } = await import(
        "~/server/api/routers/v2/user/createUserWithOrganization"
      );
      const createdUser = await createUserWithOrganization(db, {
        // KeycloakのsubをユーザーIDとして使用
        id: user.id,
        name: user.name ?? null,
        email: user.email,
        emailVerified: user.emailVerified ?? null,
        image: user.image ?? null,
      });

      // AdapterUser型に変換
      return {
        id: createdUser.id,
        email: createdUser.email,
        emailVerified: createdUser.emailVerified,
        name: createdUser.name,
        image: createdUser.image,
        role: createdUser.role,
        defaultOrganization: null,
      };
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30日
  },
  callbacks: {
    /**
     * JWTコールバック
     * Keycloak access tokenとカスタムクレームをAuth.js JWTに保存
     */
    async jwt({ token, account, profile, user }): Promise<JWT> {
      // 初回サインイン時（accountが存在する場合）
      if (account?.provider === "keycloak") {
        // Keycloak access tokenを保存
        token.accessToken = account.access_token;
        token.expiresAt = account.expires_at;
        token.refreshToken = account.refresh_token;

        // profileからKeycloakカスタムクレーム（tumiki）を取得
        const keycloakProfile = profile as {
          sub: string;
          email?: string;
          name?: string;
          tumiki?: {
            organization_id: string;
            organization_group: string;
            roles: string[];
          };
        };

        // カスタムクレームをtokenに保存
        if (keycloakProfile.tumiki) {
          token.organizationId = keycloakProfile.tumiki.organization_id;
          token.organizationGroup = keycloakProfile.tumiki.organization_group;
          token.roles = keycloakProfile.tumiki.roles;
        } else {
          token.organizationId = null;
          token.organizationGroup = null;
          token.roles = [];
        }
      }

      // userオブジェクトが存在する場合（初回サインイン時のみ）
      if (user) {
        token.userId = user.id;
        token.role = (user as { role?: Role }).role ?? "USER";

        // DBからdefaultOrganizationSlugを取得
        const dbUser = await db.user.findUnique({
          where: { id: user.id },
          select: { defaultOrganizationSlug: true },
        });

        if (dbUser?.defaultOrganizationSlug) {
          // slugからorganizationIdを取得
          const org = await db.organization.findUnique({
            where: { slug: dbUser.defaultOrganizationSlug },
            select: { id: true },
          });

          if (org) {
            token.organizationId = org.id;
            token.organizationSlug = dbUser.defaultOrganizationSlug;
          }
        }
      }

      return token;
    },

    /**
     * セッションコールバック
     * JWTトークンからクライアントに返すセッション情報を構築
     */
    async session({ session, token }): Promise<Session> {
      if (session.user && token?.userId) {
        // Keycloak組織ロール配列
        const roles = token.roles! ?? [];

        // session.userを新しいオブジェクトとして再構築
        // 型アサーションを使用してnext-authのデフォルト型との競合を回避
        Object.assign(session.user, {
          id: token.userId,
          sub: token.userId,
          email: (token.email as string | null) ?? null,
          name: (token.name as string | null) ?? null,
          image: (token.picture as string | null) ?? null,
          role: token.role! ?? "USER",
          organizationId: (token.organizationId as string | null) ?? null,
          organizationSlug: (token.organizationSlug as string | null) ?? null,
          roles: roles,
          isOrganizationAdmin: roles.some(
            (role) => role === "Owner" || role === "Admin",
          ),
        });
      }
      return session;
    },
  },
});

/**
 * Auth.js型定義の拡張
 */
declare module "next-auth" {
  // Session型を完全に上書き（email, name, imageをnull許容型に）
  interface Session {
    user: {
      id: string;
      sub: string; // Keycloak互換
      email: string | null;
      name: string | null;
      image: string | null;
      role: Role;
      organizationId: string | null;
      organizationSlug: string | null;
      isOrganizationAdmin: boolean; // 組織内管理者権限（rolesから判定）
      roles: string[]; // Keycloak組織ロール配列
      defaultOrganization: {
        id: string;
        slug: string;
        members: Array<{ userId: string }>;
      } | null;
    };
    expires: string;
  }

  interface User {
    role: Role;
    defaultOrganization: {
      id: string;
      slug: string;
      members: Array<{ userId: string }>;
    } | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    role?: Role;
    organizationId?: string | null;
    organizationSlug?: string | null;
    organizationGroup?: string | null;
    roles?: string[];
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
    // デフォルトのJWTフィールド（next-authから継承）
    email?: string | null;
    name?: string | null;
    picture?: string | null;
  }
}

declare module "@auth/core/adapters" {
  interface AdapterUser {
    role: Role;
    defaultOrganization: {
      id: string;
      slug: string;
      members: Array<{ userId: string }>; // isAdminを削除
    } | null;
  }
}
