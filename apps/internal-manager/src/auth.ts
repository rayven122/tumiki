import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";
import type { OAuthConfig } from "next-auth/providers";
import { createCustomAdapter } from "~/lib/auth/adapter";
import { jwtCallback, sessionCallback } from "~/lib/auth/callbacks";
import type { OidcProfile } from "~/lib/auth/types";
import { ensureJacksonOidcClients } from "~/server/jackson/oidc-clients";
import { getAuthSecret } from "~/server/secrets";

// 型定義をインポート（モジュール拡張を有効化）
import "~/lib/auth/types";

export type { Session as SessionReturnType } from "next-auth";

// OIDCプロバイダー設定（Auth.js lazy config用。Entra/GWS/Okta/Keycloak対応）
const createOidcProvider = async (): Promise<OAuthConfig<OidcProfile>> => {
  const oidcEnv = await ensureJacksonOidcClients();
  return {
    id: "oidc",
    name: "SSO",
    type: "oidc",
    clientId: oidcEnv.OIDC_CLIENT_ID,
    clientSecret: oidcEnv.OIDC_CLIENT_SECRET,
    issuer: oidcEnv.OIDC_ISSUER,
    // jackson は CSRF 防止のため state パラメータを必須とするため明示的に指定
    checks: ["pkce", "state"],
    // email のみで既存アカウントへ自動リンクしない。IdP migration が必要な場合は
    // ExternalIdentity を管理者フローで明示的に移行する。
    allowDangerousEmailAccountLinking: false,
    // NextAuth のデフォルト signin ページが authjs.dev/img/providers/oidc.svg を
    // 取得しようとして 404 になるため、ローカル SVG で上書きする
    style: { logo: "/sso-logo.svg", text: "#fff", bg: "#1f2937" },
    // sub を User.id に使うことで ExternalIdentity の (provider, sub) → userId マッピングが成立する
    profile: (profile) => ({
      id: profile.sub,
      email: profile.email ?? null,
      name: profile.name ?? null,
      image: profile.picture ?? null,
    }),
  };
};

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth(
  async (): Promise<NextAuthConfig> => ({
    trustHost: true,
    providers: [await createOidcProvider()],
    pages: { signIn: "/auth/signin" },
    secret: getAuthSecret(),
    adapter: createCustomAdapter(),
    session: { strategy: "jwt" },
    callbacks: {
      jwt: jwtCallback,
      session: sessionCallback,
    },
  }),
);
