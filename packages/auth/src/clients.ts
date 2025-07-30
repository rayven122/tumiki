import { Auth0Client } from "@auth0/nextjs-auth0/server";
import { ManagementClient } from "auth0";

// メイン認証用クライアント（ユーザー認証）
export const auth0 = new Auth0Client({
  domain: process.env.AUTH0_DOMAIN!,
  clientId: process.env.AUTH0_CLIENT_ID!,
  appBaseUrl: process.env.APP_BASE_URL!,
  secret: process.env.AUTH0_SECRET!,
});

// OAuth管理専用クライアント（外部プロバイダー接続）
export const auth0OAuth = new Auth0Client({
  domain: process.env.AUTH0_DOMAIN!,
  clientId: process.env.AUTH0_OAUTH_CLIENT_ID,
  clientSecret: process.env.AUTH0_OAUTH_CLIENT_SECRET,
  appBaseUrl: process.env.APP_BASE_URL!,
  secret: process.env.AUTH0_SECRET!,
  session: {
    cookie: {
      name: "__oauthSession", // __session から変更
    },
  },
  routes: {
    login: "/oauth/auth/login",
    callback: "/oauth/auth/callback",
    logout: "/oauth/auth/logout",
  },
});

// Management API クライアント
export const managementClient = new ManagementClient({
  domain: process.env.AUTH0_M2M_DOMAIN!,
  clientId: process.env.AUTH0_M2M_CLIENT_ID!,
  clientSecret: process.env.AUTH0_M2M_CLIENT_SECRET!,
});
