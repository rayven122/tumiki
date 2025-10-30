/**
 * Better Auth 設定ファイル
 * Keycloak OIDC統合とカスタムコールバック処理を定義
 */
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { genericOAuth } from "better-auth/plugins";

import { db } from "@tumiki/db/server";

if (!process.env.BETTER_AUTH_SECRET) {
  throw new Error("BETTER_AUTH_SECRET is not set");
}

if (!process.env.KEYCLOAK_ISSUER) {
  throw new Error("KEYCLOAK_ISSUER is not set");
}

if (!process.env.KEYCLOAK_CLIENT_ID) {
  throw new Error("KEYCLOAK_CLIENT_ID is not set");
}

if (!process.env.KEYCLOAK_CLIENT_SECRET) {
  throw new Error("KEYCLOAK_CLIENT_SECRET is not set");
}

export const auth = betterAuth({
  database: prismaAdapter(db, {
    provider: "postgresql",
  }),

  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL ?? "https://local.tumiki.cloud:3000",

  session: {
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5分
    },
  },

  plugins: [
    genericOAuth({
      config: [
        {
          providerId: "keycloak",
          clientId: process.env.KEYCLOAK_CLIENT_ID,
          clientSecret: process.env.KEYCLOAK_CLIENT_SECRET,
          discoveryUrl: `${process.env.KEYCLOAK_ISSUER}/.well-known/openid-configuration`,
          scopes: ["openid", "email", "profile"],
          pkce: true,
        },
      ],
    }),
  ],

  user: {
    fields: {
      name: "name",
      email: "email",
      image: "image",
      emailVerified: "emailVerified",
    },
    additionalFields: {
      keycloakId: {
        type: "string",
        required: false,
        unique: true,
      },
      role: {
        type: "string",
        required: true,
        defaultValue: "USER",
      },
    },
  },

  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["keycloak"],
    },
  },

  databaseHooks: {
    user: {
      create: {
        after: async (user): Promise<void> => {
          // ユーザー作成後の処理
          // Keycloakからの同期の場合、keycloakIdが設定されている
          const keycloakId = (user as { keycloakId?: string }).keycloakId;
          const email = (user as { email?: string }).email;
          const name = (user as { name?: string }).name;
          const image = (user as { image?: string | null }).image;

          if (keycloakId && email && name) {
            // 既に作成されているユーザーの情報を更新
            await db.user.update({
              where: { keycloakId },
              data: {
                email,
                name,
                image,
                emailVerified: true, // Keycloak認証済みユーザーはメール確認済み
              },
            });
          }
        },
      },
    },
  },

  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
    cookiePrefix: "better-auth",
    crossSubDomainCookies: {
      enabled: false,
    },
  },

  logger: {
    level: process.env.NODE_ENV === "development" ? "debug" : "error",
  },
});

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
