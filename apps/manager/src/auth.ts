import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@tumiki/db/server";
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
    ...PrismaAdapter(db),
    createUser: async (user) => {
      try {
        // KeycloakのsubをユーザーIDとして使用
        const userId = user.id || crypto.randomUUID();

        // emailの検証（必須フィールド）
        if (!user.email) {
          throw new Error(
            "Email is required for user creation. Keycloak must be configured to provide email.",
          );
        }

        const createdUser = await db.user.create({
          data: {
            id: userId,
            name: user.name,
            email: user.email,
            emailVerified: user.emailVerified,
            image: user.image,
          },
        });

        // データベースからのemailも検証（念のため）
        if (!createdUser.email) {
          throw new Error(
            "User was created but email is null in database. This should not happen.",
          );
        }

        // AdapterUser型に変換（emailは必須）
        return {
          id: createdUser.id,
          email: createdUser.email,
          emailVerified: createdUser.emailVerified,
          name: createdUser.name,
          image: createdUser.image,
        };
      } catch (error) {
        console.error("[Auth] Failed to create user:", error);
        // エラーを再スローして、Auth.jsが適切にハンドリングできるようにする
        throw error instanceof Error
          ? error
          : new Error("User creation failed");
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
      if (account?.provider === "keycloak" && account.providerAccountId) {
        try {
          // DBからユーザー情報取得
          const dbUser = await db.user.findUnique({
            where: { id: user.id },
            include: {
              members: {
                where: {
                  organization: { isPersonal: true },
                },
                include: {
                  organization: true,
                },
              },
            },
          });

          if (!dbUser) {
            console.error("[Auth] User not found in database:", user.id);
            return true; // ログインは許可するが属性更新はスキップ
          }

          const personalOrgMember = dbUser.members[0];
          if (!personalOrgMember?.organization) {
            console.warn("[Auth] No personal organization found:", user.id);
            return true;
          }

          // Keycloak属性を更新
          const { updateKeycloakUserAttributes } = await import(
            "~/lib/keycloak-admin"
          );

          const result = await updateKeycloakUserAttributes(
            account.providerAccountId,
            {
              tumiki_org_id: personalOrgMember.organization.id,
              tumiki_is_org_admin: personalOrgMember.isAdmin ? "true" : "false",
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
     */
    async session({ session, user }): Promise<Session> {
      if (session.user) {
        // Auth0の形式に合わせてsubプロパティを追加
        session.user.sub = user.id;
        session.user.id = user.id;
        session.user.email = user.email ?? null;
        session.user.name = user.name ?? null;
        session.user.image = user.image ?? null;
      }
      return session;
    },
  },
});

/**
 * セッション型定義の拡張
 */
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      sub: string; // Auth0互換
      email: string | null;
      name: string | null;
      image: string | null;
    };
  }
}
