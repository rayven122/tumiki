import type GroupRepresentation from "@keycloak/keycloak-admin-client/lib/defs/groupRepresentation.js";
import type RoleRepresentation from "@keycloak/keycloak-admin-client/lib/defs/roleRepresentation.js";
import type UserRepresentation from "@keycloak/keycloak-admin-client/lib/defs/userRepresentation.js";

/**
 * 組織内のロール定義
 * Owner: 全権限
 * Admin: メンバー管理可能
 * Member: 基本利用
 * Viewer: 読み取り専用
 */
export type OrganizationRole = "Owner" | "Admin" | "Member" | "Viewer";

/**
 * 組織プロバイダーの共通インターフェース
 * 将来的に Auth0, AWS Cognito などに切り替え可能
 */
export type IOrganizationProvider = {
  /**
   * 組織グループを作成
   */
  createOrganization: (params: {
    name: string;
    groupName: string; // 例: "@user-id" or "team-slug"
    ownerId: string;
  }) => Promise<{ success: boolean; externalId: string; error?: string }>;

  /**
   * 組織グループを削除
   */
  deleteOrganization: (params: {
    externalId: string;
  }) => Promise<{ success: boolean; error?: string }>;

  /**
   * ユーザーを組織に追加
   */
  addMember: (params: {
    externalId: string;
    userId: string;
    role: OrganizationRole;
  }) => Promise<{ success: boolean; error?: string }>;

  /**
   * ユーザーを組織から削除
   */
  removeMember: (params: {
    externalId: string;
    userId: string;
  }) => Promise<{ success: boolean; error?: string }>;

  /**
   * ユーザーのロールを更新
   */
  updateMemberRole: (params: {
    externalId: string;
    userId: string;
    newRole: OrganizationRole;
  }) => Promise<{ success: boolean; error?: string }>;

  /**
   * ユーザーのセッションを無効化（ロール変更の即時反映用）
   */
  invalidateUserSessions: (params: {
    userId: string;
  }) => Promise<{ success: boolean; error?: string }>;
};

/**
 * Keycloak Admin API設定
 */
export type KeycloakAdminConfig = {
  baseUrl: string;
  realm: string;
  adminUsername: string;
  adminPassword: string;
};

/**
 * Keycloakグループ情報
 * 公式ライブラリの型をre-export
 */
export type KeycloakGroup = GroupRepresentation;

/**
 * Keycloakロール情報
 * 公式ライブラリの型をre-export
 */
export type KeycloakRole = RoleRepresentation;

/**
 * Keycloakユーザー情報
 * 公式ライブラリの型をre-export
 */
export type KeycloakUser = UserRepresentation;
