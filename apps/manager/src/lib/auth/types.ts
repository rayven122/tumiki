import type { Role } from "@tumiki/db/server";

/**
 * Tumiki カスタムクレーム型定義
 * Keycloak JWTに含まれる組織関連情報
 */
export type TumikiClaims = {
  organization_id: string;
  organization_group: string;
  roles: string[];
};

/**
 * Keycloak JWTペイロード型定義
 */
export type KeycloakJWTPayload = {
  sub: string;
  email?: string;
  name?: string;
  tumiki?: TumikiClaims;
};

/**
 * Keycloak Profileコールバック用の型定義
 */
export type KeycloakProfile = KeycloakJWTPayload & {
  picture?: string;
};

/**
 * Auth.js型定義の拡張
 * Keycloak JWTの構造を可能な限り保持
 */
declare module "next-auth" {
  // Session型を完全に上書き（email, name, imageをnull許容型に）
  interface Session {
    user: {
      id: string;
      sub: string; // Keycloak sub（userIdと同じ）
      email: string | null;
      name: string | null;
      image: string | null;
      role: Role; // アプリケーション内のロール
      organizationSlug: string | null; // DB管理の組織slug
      isOrganizationAdmin: boolean; // 組織内管理者権限（tumiki.rolesから判定）
      tumiki: TumikiClaims | null; // Keycloakカスタムクレーム（そのまま保持）
      // 既存コードとの互換性のための派生プロパティ
      organizationId: string | null; // tumiki.organization_id のエイリアス
      roles: string[]; // tumiki.roles のエイリアス
    };
    expires: string;
  }

  interface User {
    role?: Role;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    // Keycloak JWTペイロード（可能な限り元の構造を保持）
    sub?: string; // Keycloak user ID
    email?: string | null;
    name?: string | null;
    picture?: string | null;
    tumiki?: TumikiClaims | null; // Keycloakカスタムクレーム

    // Keycloak OAuth トークン
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;

    // アプリケーション固有フィールド
    role?: Role; // DB管理のユーザーロール
    organizationSlug?: string | null; // DB管理の組織slug
  }
}
