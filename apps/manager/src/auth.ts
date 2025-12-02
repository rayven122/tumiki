import { PrismaAdapter } from "@auth/prisma-adapter";
import { db, type Role } from "@tumiki/db/server";
import NextAuth from "next-auth";
import type { Session } from "next-auth";
import authConfig from "~/auth.config";

// Re-export verification utilities
export { isVerificationModeEnabled } from "~/lib/verification";

/**
 * セッション型定義
 */
export type SessionReturnType = Session | null;

/**
 * SessionData型 - Auth0互換の型エイリアス
 * @deprecated Session型を直接使用してください
 */
export type SessionData = Session;

/**
 * Auth.js メイン設定
 * Prisma Adapterを使用したデータベースセッション管理
 */
/**
 * アダプターメソッドをラップしてログ出力を追加
 */
const wrapAdapter = (adapter: ReturnType<typeof PrismaAdapter>) => {
  const wrapped: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(adapter)) {
    if (typeof value === "function") {
      wrapped[key] = async (...args: unknown[]): Promise<unknown> => {
        console.log(`[Adapter] ${key} called with:`, args);
        try {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
          const result = await value(...args);
          console.log(`[Adapter] ${key} success:`, result);
          // eslint-disable-next-line @typescript-eslint/no-unsafe-return
          return result;
        } catch (error) {
          console.error(`[Adapter] ${key} failed:`, error);
          throw error;
        }
      };
    } else {
      wrapped[key] = value;
    }
  }

  return wrapped;
};

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  ...authConfig,
  pages: {
    signIn: "/signin",
  },
  adapter: {
    ...wrapAdapter(PrismaAdapter(db)),
    createUser: async (user) => {
      console.log("[Adapter] createUser called with:", {
        id: user.id,
        email: user.email,
        name: user.name,
      });

      try {
        // KeycloakのsubをユーザーIDとして使用
        const userId = user.id || crypto.randomUUID();

        // emailの検証（必須フィールド）
        if (!user.email) {
          throw new Error(
            "Email is required for user creation. Keycloak must be configured to provide email.",
          );
        }

        // ユーザーと個人組織を作成
        const { createUserWithOrganization } = await import(
          "~/server/api/routers/v2/user/createUserWithOrganization"
        );
        const createdUser = await createUserWithOrganization(db, {
          id: userId,
          name: user.name ?? null,
          email: user.email,
          emailVerified: user.emailVerified ?? null,
          image: user.image ?? null,
        });

        // AdapterUser型に変換
        // createUserは作成直後なので、roleとdefaultOrganizationはまだ設定されていない
        const result = {
          id: createdUser.id,
          email: createdUser.email,
          emailVerified: createdUser.emailVerified,
          name: createdUser.name,
          image: createdUser.image,
          role: createdUser.role,
          defaultOrganization: null,
        };

        console.log("[Adapter] createUser success:", {
          id: result.id,
          email: result.email,
        });
        return result;
      } catch (error) {
        console.error("[Adapter] createUser failed:", error);
        throw error;
      }
    },
    // セッション取得時に組織情報も一緒に取得してパフォーマンス最適化
    getSessionAndUser: async (sessionToken) => {
      console.log("[Adapter] getSessionAndUser called with token:", {
        tokenLength: sessionToken.length,
        tokenPrefix: sessionToken.substring(0, 10),
      });

      try {
        const { getSessionAndUser } = await import(
          "~/server/api/routers/v2/user/getSessionAndUser"
        );
        const result = await getSessionAndUser(db, { sessionToken });

        if (result) {
          console.log("[Adapter] getSessionAndUser success:", {
            userId: result.user.id,
            userEmail: result.user.email,
            hasDefaultOrg: !!result.user.defaultOrganization,
          });
        } else {
          console.log("[Adapter] getSessionAndUser returned null");
        }

        return result;
      } catch (error) {
        console.error("[Adapter] getSessionAndUser failed:", error);
        throw error;
      }
    },
  },
  session: {
    strategy: "database",
    maxAge: 30 * 24 * 60 * 60, // 30日
  },
  callbacks: {
    /**
     * サインインコールバック
     * ユーザーログイン時にKeycloak属性を同期
     */
    async signIn({ user, account }): Promise<boolean> {
      if (
        account?.provider === "keycloak" &&
        account.providerAccountId &&
        user.id
      ) {
        try {
          // ユーザーの個人組織情報を取得
          const { getUserPersonalOrganization } = await import(
            "~/server/api/routers/v2/user/getUserPersonalOrganization"
          );
          const personalOrg = await getUserPersonalOrganization(db, {
            userId: user.id,
          });

          // Keycloak属性を更新
          const { updateKeycloakUserAttributes } = await import(
            "~/lib/keycloak-admin"
          );

          const result = await updateKeycloakUserAttributes(
            account.providerAccountId,
            {
              tumiki_org_id: personalOrg.organizationId,
              tumiki_is_org_admin: personalOrg.isAdmin ? "true" : "false",
              tumiki_tumiki_user_id: user.id,
              // mcp_instance_id はオプショナル（管理画面JWTには不要）
            },
          );

          if (!result.success) {
            console.error(
              "[Auth] Failed to update Keycloak attributes:",
              result.error,
            );
          }
        } catch (error) {
          console.error("[Auth] Error in signIn callback:", error);
          // エラーが発生してもログインは許可
        }
      }

      return true;
    },

    /**
     * セッションコールバック
     * クライアントに返すセッション情報を構築
     * userオブジェクトにはgetSessionAndUserで取得した組織情報が含まれている
     */
    async session({ session, user }): Promise<Session> {
      if (session.user) {
        // 基本ユーザー情報
        session.user.sub = user.id;
        session.user.id = user.id;
        session.user.email = user.email ?? null;
        session.user.name = user.name ?? null;
        session.user.image = user.image ?? null;

        // userオブジェクトから組織情報を取得（getSessionAndUserで既に取得済み）
        const defaultOrg = user.defaultOrganization;
        const member = defaultOrg?.members?.find((m) => m.userId === user.id);

        // セッションにユーザー情報を設定
        session.user.role = user.role;
        session.user.organizationId = defaultOrg?.id ?? null;
        session.user.organizationSlug = defaultOrg?.slug ?? null;
        session.user.isOrganizationAdmin = member?.isAdmin ?? false;
        session.user.defaultOrganization = defaultOrg;
      }
      return session;
    },
  },
});

/**
 * Auth.js型定義の拡張
 */
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      sub: string; // Auth0互換
      email: string | null;
      name: string | null;
      image: string | null;
      role: Role;
      organizationId: string | null;
      organizationSlug: string | null;
      isOrganizationAdmin: boolean; // 組織内管理者権限
      defaultOrganization: {
        id: string;
        slug: string;
        members: Array<{ userId: string; isAdmin: boolean }>;
      } | null;
    };
  }

  interface User {
    role: Role;
    defaultOrganization: {
      id: string;
      slug: string;
      members: Array<{ userId: string; isAdmin: boolean }>;
    } | null;
  }
}

declare module "@auth/core/adapters" {
  interface AdapterUser {
    role: Role;
    defaultOrganization: {
      id: string;
      slug: string;
      members: Array<{ userId: string; isAdmin: boolean }>;
    } | null;
  }
}
