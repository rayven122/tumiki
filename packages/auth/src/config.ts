import type { NextAuthConfig } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";

import { db } from "@tumiki/db";

import { providers } from "./providers.js";

import "./types.js";

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authConfig: NextAuthConfig = {
  trustHost: true,
  providers,
  pages: {
    signIn: "/login",
  },
  // @ts-expect-error - PrismaAdapter type incompatibility with extended Prisma client
  adapter: PrismaAdapter(db),
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
      if (token.sub) {
        session.user.id = token.sub;
      }

      if (token.role) {
        session.user.role = token.role;
      }
      return session;
    },
  },
  session: { strategy: "jwt" },
} satisfies NextAuthConfig;
