import NextAuth from "next-auth";
import type { OAuthConfig } from "next-auth/providers";
import { getOidcEnv, isOidcConfigured } from "~/lib/env";
import { createCustomAdapter } from "~/lib/auth/adapter";
import { jwtCallback, sessionCallback } from "~/lib/auth/callbacks";
import type { OidcProfile } from "~/lib/auth/types";

// 型定義をインポート（モジュール拡張を有効化）
import "~/lib/auth/types";

export type { Session as SessionReturnType } from "next-auth";

// 未設定時はダミー値でクラッシュを回避し、middleware が /setup へ誘導する
const oidcEnv = isOidcConfigured()
  ? getOidcEnv()
  : {
      OIDC_CLIENT_ID: "unconfigured",
      OIDC_CLIENT_SECRET: "unconfigured",
      OIDC_ISSUER: "https://unconfigured.invalid",
    };

/**
 * 汎用OIDCプロバイダー設定
 * Entra ID / Google Workspace / Okta / Keycloak など任意のOIDC準拠プロバイダーに対応
 */
const oidcProvider: OAuthConfig<OidcProfile> = {
  id: "oidc",
  name: "SSO",
  type: "oidc",
  clientId: oidcEnv.OIDC_CLIENT_ID,
  clientSecret: oidcEnv.OIDC_CLIENT_SECRET,
  issuer: oidcEnv.OIDC_ISSUER,
  // NextAuth のデフォルト signin ページが authjs.dev/img/providers/oidc.svg を
  // 取得しようとして 404 になるため、ローカル SVG で上書きする
  style: { logo: "/sso-logo.svg", text: "#fff", bg: "#1f2937" },
  // sub を User.id に使うことで ExternalIdentity の (provider, sub) → userId マッピングが成立する
  profile(profile) {
    return {
      id: profile.sub,
      email: profile.email ?? null,
      name: profile.name ?? null,
      image: profile.picture ?? null,
    };
  },
};

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  trustHost: true,
  providers: [oidcProvider],
  adapter: createCustomAdapter(),
  session: { strategy: "jwt" },
  callbacks: {
    jwt: jwtCallback,
    session: sessionCallback,
  },
});
