/**
 * Better Auth 設定ファイル
 * Keycloak OIDC統合とカスタムコールバック処理を定義
 */
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { genericOAuth } from "better-auth/plugins";

import { db } from "@tumiki/db/server";

/**
 * Keycloak OIDCプロファイル型定義
 */
type KeycloakProfile = {
  sub: string;
  email: string;
  name: string;
  picture?: string;
  email_verified?: boolean;
};

/**
 * 環境変数の検証を遅延実行
 * ビルド時やテスト時の問題を回避するため、実際に使用するタイミングで検証
 */
const validateEnvVars = (): {
  BETTER_AUTH_SECRET: string;
  KEYCLOAK_ISSUER: string;
  KEYCLOAK_CLIENT_ID: string;
  KEYCLOAK_CLIENT_SECRET: string;
} => {
  const required = {
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    KEYCLOAK_ISSUER: process.env.KEYCLOAK_ISSUER,
    KEYCLOAK_CLIENT_ID: process.env.KEYCLOAK_CLIENT_ID,
    KEYCLOAK_CLIENT_SECRET: process.env.KEYCLOAK_CLIENT_SECRET,
  };

  const missing = Object.entries(required)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`,
    );
  }

  // 検証済みなので全ての値がstringとして存在することを保証
  return required as {
    BETTER_AUTH_SECRET: string;
    KEYCLOAK_ISSUER: string;
    KEYCLOAK_CLIENT_ID: string;
    KEYCLOAK_CLIENT_SECRET: string;
  };
};

// 環境変数を検証して取得
const envVars = validateEnvVars();

export const auth = betterAuth({
  database: prismaAdapter(db, {
    provider: "postgresql",
  }),

  secret: envVars.BETTER_AUTH_SECRET,
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
          clientId: envVars.KEYCLOAK_CLIENT_ID,
          clientSecret: envVars.KEYCLOAK_CLIENT_SECRET,
          discoveryUrl: `${envVars.KEYCLOAK_ISSUER}/.well-known/openid-configuration`,
          scopes: ["openid", "email", "profile"],
          pkce: true,
          // Keycloakのプロファイル情報をユーザーフィールドにマッピング
          mapProfileToUser: (profile) => {
            const keycloakProfile = profile as KeycloakProfile;
            return {
              email: keycloakProfile.email,
              name: keycloakProfile.name,
              image: keycloakProfile.picture,
              emailVerified: true, // Keycloak認証済みユーザーはメール確認済み
              keycloakId: keycloakProfile.sub, // OIDCのsubクレームをkeycloakIdに設定
            };
          },
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
  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
    cookiePrefix: "better-auth",
    crossSubDomainCookies: {
      enabled: false,
    },
  },
  logger: {
    // 機密情報（トークン、シークレット）のログ出力を防ぐため、infoレベルを使用
    level: process.env.NODE_ENV === "development" ? "info" : "error",
  },
});

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
