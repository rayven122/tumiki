import type { KeycloakAdminConfig } from "./types.js";

/**
 * 環境変数からKeycloak設定を読み込む
 *
 * 環境変数の優先順位:
 * - KEYCLOAK_URL: 直接baseURLを指定（最優先）
 * - KEYCLOAK_ISSUER: Issuer URLからbaseURLを導出
 * - KEYCLOAK_REALM: Keycloakのrealm名（デフォルト: "tumiki"）
 * - KEYCLOAK_ADMIN_USERNAME: Keycloak管理者ユーザー名（必須）
 * - KEYCLOAK_ADMIN_PASSWORD: Keycloak管理者パスワード（必須）
 *
 * @throws {Error} 必須の環境変数が設定されていない場合
 * @returns Keycloak Admin API設定
 */
export const loadKeycloakConfigFromEnv = (): KeycloakAdminConfig => {
  const keycloakUrl = process.env.KEYCLOAK_URL;
  const keycloakIssuer = process.env.KEYCLOAK_ISSUER;
  const keycloakRealm = process.env.KEYCLOAK_REALM ?? "tumiki";
  const keycloakAdmin = process.env.KEYCLOAK_ADMIN_USERNAME;
  const keycloakPassword = process.env.KEYCLOAK_ADMIN_PASSWORD;

  // baseURLの導出
  let baseUrl = keycloakUrl;

  // KEYCLOAK_URLが設定されていない場合、KEYCLOAK_ISSUERから導出
  if (!baseUrl && keycloakIssuer) {
    // KEYCLOAK_ISSUERからbaseURLを抽出
    // パターン1: "http://localhost:8443/realms/tumiki" -> "http://localhost:8443"
    // パターン2: "http://localhost:8443" -> "http://localhost:8443"
    const match = /^(https?:\/\/[^/]+)/.exec(keycloakIssuer);
    if (match?.[1]) {
      baseUrl = match[1];
    }
  }

  // 必須環境変数の検証
  if (!baseUrl) {
    throw new Error(
      "KEYCLOAK_URL または KEYCLOAK_ISSUER 環境変数が設定されていません",
    );
  }

  if (!keycloakAdmin) {
    throw new Error("KEYCLOAK_ADMIN_USERNAME 環境変数が設定されていません");
  }

  if (!keycloakPassword) {
    throw new Error("KEYCLOAK_ADMIN_PASSWORD 環境変数が設定されていません");
  }

  return {
    baseUrl,
    realm: keycloakRealm,
    adminUsername: keycloakAdmin,
    adminPassword: keycloakPassword,
  };
};
