import NextAuth from "next-auth";
import type { OAuthConfig } from "next-auth/providers";
import { getOidcEnv } from "~/lib/env";
import { createCustomAdapter } from "~/lib/auth/adapter";
import { jwtCallback, sessionCallback } from "~/lib/auth/callbacks";
import type { OidcProfile } from "~/lib/auth/types";

// 型定義をインポート（モジュール拡張を有効化）
import "~/lib/auth/types";

export type { Session as SessionReturnType } from "next-auth";

const { OIDC_CLIENT_ID, OIDC_CLIENT_SECRET, OIDC_ISSUER } = getOidcEnv();

/**
 * 汎用OIDCプロバイダー設定
 * Entra ID / Google Workspace / Okta / Keycloak など任意のOIDC準拠プロバイダーに対応
 */
const oidcProvider: OAuthConfig<OidcProfile> = {
  id: "oidc",
  name: "SSO",
  type: "oidc",
  clientId: OIDC_CLIENT_ID,
  clientSecret: OIDC_CLIENT_SECRET,
  issuer: OIDC_ISSUER,
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
