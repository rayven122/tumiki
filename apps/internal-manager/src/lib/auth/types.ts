import type { Role } from "@tumiki/internal-db/server";

/**
 * IDPから受け取るTumikiカスタムクレーム
 * OIDC プロバイダー側で `tumiki` クレームとして設定する
 * （Keycloak: Protocol Mapper / Entra ID: optional claims / Okta: claim policy）
 */
export type TumikiIdpClaims = {
  group_roles: string[]; // ユーザーが所属する組織グループのリスト
  roles: string[]; // アプリケーションロールのリスト
};

/**
 * Auth.js内部で使用するカスタムクレーム型定義
 */
export type TumikiClaims = {
  org_slugs: string[];
  org_id: string | null;
  org_slug: string | null;
  roles: string[];
  group_roles?: string[];
};

/**
 * 汎用OIDCプロファイル型定義
 * OIDC標準クレーム + Tumikiカスタムクレーム
 */
export type OidcProfile = {
  sub: string;
  email?: string;
  name?: string;
  picture?: string;
  tumiki?: TumikiIdpClaims;
};

/**
 * Auth.js型定義の拡張
 * declaration mergingにはinterfaceが必須
 */
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      sub: string;
      email: string | null;
      name: string | null;
      image: string | null;
      role: Role;
      tumiki: TumikiClaims | null;
    };
    expires: string;
    accessToken?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    sub?: string;
    email?: string | null;
    name?: string | null;
    picture?: string | null;
    tumiki?: TumikiClaims | null;
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
    role?: Role;
    provider?: string;
    oidcSub?: string;
  }
}
