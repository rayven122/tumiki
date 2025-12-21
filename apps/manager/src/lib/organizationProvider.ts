import {
  KeycloakOrganizationProvider,
  type IOrganizationProvider,
} from "@tumiki/keycloak";

/**
 * 組織プロバイダーのシングルトンインスタンス
 * 環境変数でプロバイダーを切り替え可能
 */
let providerInstance: IOrganizationProvider | undefined;

/**
 * 組織プロバイダーを取得
 * シングルトンパターンで実装し、アプリケーション全体で1つのインスタンスを共有
 */
export const getOrganizationProvider = (): IOrganizationProvider => {
  if (providerInstance) {
    return providerInstance;
  }

  const providerType = process.env.ORGANIZATION_PROVIDER ?? "keycloak";

  switch (providerType) {
    case "keycloak": {
      // Keycloakプロバイダーを作成
      const keycloakIssuer = process.env.KEYCLOAK_ISSUER;
      const keycloakAdminUsername = process.env.KEYCLOAK_ADMIN_USERNAME;
      const keycloakAdminPassword = process.env.KEYCLOAK_ADMIN_PASSWORD;

      if (!keycloakIssuer) {
        throw new Error("KEYCLOAK_ISSUER environment variable is required");
      }

      if (!keycloakAdminUsername) {
        throw new Error(
          "KEYCLOAK_ADMIN_USERNAME environment variable is required",
        );
      }

      if (!keycloakAdminPassword) {
        throw new Error(
          "KEYCLOAK_ADMIN_PASSWORD environment variable is required",
        );
      }

      // issuerからベースURLを抽出（/realms/{realm}を削除）
      // 例: http://localhost:8443/realms/tumiki → http://localhost:8443
      const baseUrl = keycloakIssuer.replace(/\/realms\/[^/]+$/, "");

      providerInstance = new KeycloakOrganizationProvider({
        baseUrl,
        realm: "tumiki",
        adminUsername: keycloakAdminUsername,
        adminPassword: keycloakAdminPassword,
      });

      return providerInstance;
    }

    // 将来的に他のプロバイダー追加
    // case "auth0": {
    //   return new Auth0OrganizationProvider({ ... });
    // }
    //
    // case "cognito": {
    //   return new CognitoOrganizationProvider({ ... });
    // }

    default:
      throw new Error(`Unknown organization provider: ${providerType}`);
  }
};

/**
 * テスト用: プロバイダーインスタンスをリセット
 */
export const resetOrganizationProvider = (): void => {
  providerInstance = undefined;
};
