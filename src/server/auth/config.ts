import { PrismaAdapter } from "@auth/prisma-adapter";
import type { PrismaClient, Role } from "@prisma/client";
import type { DefaultSession, NextAuthConfig } from "next-auth";
import GitHubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import { db } from "../db";
import "next-auth/jwt";
import type { UserType } from "@/app/(auth)/auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role: Role;
      type: UserType;
    };
  }

  interface User {
    id?: string;
    email?: string | null;
    type: UserType;
  }
}

declare module "next-auth/jwt" {
  /** Returned by the `jwt` callback and `auth`, when using JWT sessions */
  interface JWT {
    id: string;
    role: Role;
    type: UserType;
  }
}

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authConfig = {
  trustHost: true,
  providers: [
    GoogleProvider({
      allowDangerousEmailAccountLinking: true,
    }),
    GitHubProvider({
      allowDangerousEmailAccountLinking: true,
    }),
    /**
     * ...add more providers here.
     *
     * Most other providers require a bit more work than the Discord provider. For example, the
     * GitHub provider requires you to add the `refresh_token_expires_in` field to the Account
     * model. Refer to the NextAuth.js docs for the provider you want to use. Example:
     *
     * @see https://next-auth.js.org/providers/github
     */
  ],
  pages: {
    signIn: "/login",
  },
  adapter: PrismaAdapter(db as PrismaClient),
  callbacks: {
    /**
     * JWTコールバック
     * トークンの生成・更新時に実行され、ユーザーの権限情報を付与
     * - token.subが存在しない場合は早期リターン
     * - DBからユーザー情報を取得し、roleをトークンに追加
     */
    async jwt({ token }) {
      if (!token.sub) return token;
      const existingUser = await db.user.findUnique({
        where: { id: token.sub },
      });
      if (!existingUser) return token;
      token.role = existingUser.role;
      return token;
    },
    /**
     * セッションコールバック
     * トークンの情報をセッションに反映させる
     * - token.sub: ユーザーの一意のID
     * - token.role: ユーザーの権限ロール
     */
    session: ({ token, session }) => {
      if (token.sub && session.user) {
        session.user.id = token.sub;
      }
      if (token.role && session.user) {
        session.user.role = token.role;
      }
      return session;
    },
  },
  session: { strategy: "jwt" },
} satisfies NextAuthConfig;
