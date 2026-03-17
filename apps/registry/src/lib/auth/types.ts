import type { Role } from "@tumiki/db/server";

/**
 * Keycloakから実際に来るカスタムクレーム型定義
 * Protocol Mapperで設定されたクレームの構造
 */
export type KeycloakTumikiClaims = {
  group_roles: string[]; // ユーザーが所属する組織グループのリスト
  roles: string[]; // Keycloakロールのリスト
};

/**
 * Auth.js内部で使用するカスタムクレーム型定義
 * JWTコールバックで変換後の構造
 */
export type TumikiClaims = {
  org_slugs: string[]; // group_rolesから名称変更
  org_id: string | null; // ユーザーの操作に応じて変更
  org_slug: string | null; // ユーザーの操作に応じて変更
  roles: string[]; // 変更なし
  group_roles?: string[]; // Keycloakのgroup_rolesを保存（組織切り替え時のロール再計算用）
};

/**
 * Keycloak JWTペイロード型定義
 */
export type KeycloakJWTPayload = {
  sub: string;
  email?: string;
  name?: string;
  tumiki?: KeycloakTumikiClaims; // Keycloakからのクレーム型を使用
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
      tumiki: TumikiClaims | null; // Keycloakカスタムクレーム（組織情報はここに含まれる）
    };
    expires: string;
    /// MCP Proxy認証用のKeycloakアクセストークン
    accessToken?: string;
  }

  interface User {
    role?: Role;
    profileSub?: string; // Keycloak subをカスタムフィールドとして保持
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

    // トークンリフレッシュ時にKeycloakから取得した最新group_roles
    keycloakGroupRoles?: string[];
  }
}
