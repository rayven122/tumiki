/**
 * @tumiki/keycloak
 *
 * Keycloak組織管理の抽象化レイヤー
 * 将来的にAuth0、AWS Cognito、Oktaなどへの切り替えを容易にするための
 * プロバイダーパターンを実装
 *
 * 公式の @keycloak/keycloak-admin-client を使用し、
 * 組織管理に特化したシンプルなインターフェースを提供
 */

// 型定義のエクスポート
export type {
  OrganizationRole,
  IOrganizationProvider,
  KeycloakAdminConfig,
  KeycloakGroup,
  KeycloakRole,
  KeycloakUser,
} from "./types.js";

// Keycloakプロバイダー実装のエクスポート
export { KeycloakOrganizationProvider } from "./provider.js";

// Keycloak Admin APIクライアントのエクスポート
export { KeycloakAdminClient } from "./client.js";
