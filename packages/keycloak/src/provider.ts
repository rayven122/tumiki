import type {
  IOrganizationProvider,
  KeycloakAdminConfig,
  KeycloakRole,
  OrganizationRole,
} from "./types.js";
import { KeycloakAdminClient } from "./client.js";
import * as services from "./providerServices.js";

/**
 * Keycloak実装の組織プロバイダー
 * IOrganizationProviderインターフェースを実装し、
 * Keycloak Admin APIを使用して組織管理を行う
 */
export class KeycloakOrganizationProvider implements IOrganizationProvider {
  private client: KeycloakAdminClient;

  constructor(config: KeycloakAdminConfig) {
    this.client = new KeycloakAdminClient(config);
  }

  /**
   * 組織グループを作成
   */
  async createOrganization(params: {
    name: string;
    groupName: string;
    ownerId: string;
    createDefaultRoles?: boolean;
  }): Promise<{ success: boolean; externalId: string; error?: string }> {
    return services.createOrganization(this.client, params, (memberParams) =>
      this.addMember(memberParams),
    );
  }

  /**
   * 組織グループを削除
   */
  async deleteOrganization(params: {
    externalId: string;
  }): Promise<{ success: boolean; error?: string }> {
    return services.deleteOrganization(this.client, params);
  }

  /**
   * ユーザーを組織に追加
   */
  async addMember(params: {
    externalId: string;
    userId: string;
    role: OrganizationRole;
  }): Promise<{ success: boolean; error?: string }> {
    return services.addMember(this.client, params);
  }

  /**
   * ユーザーを組織から削除
   */
  async removeMember(params: {
    externalId: string;
    userId: string;
  }): Promise<{ success: boolean; error?: string }> {
    return services.removeMember(this.client, params);
  }

  /**
   * ユーザーのロールを更新
   */
  async updateMemberRole(params: {
    externalId: string;
    userId: string;
    newRole: OrganizationRole;
  }): Promise<{ success: boolean; error?: string }> {
    return services.updateMemberRole(this.client, params);
  }

  /**
   * ユーザーのセッションを無効化
   */
  async invalidateUserSessions(params: {
    userId: string;
  }): Promise<{ success: boolean; error?: string }> {
    return services.invalidateUserSessions(this.client, params);
  }

  /**
   * グループロールを作成（Keycloak固有機能）
   */
  async createGroupRole(
    groupId: string,
    params: {
      name: string;
      description?: string;
      attributes?: Record<string, string[]>;
    },
  ): Promise<{ success: boolean; roleId?: string; error?: string }> {
    return this.client.createGroupRole(groupId, params);
  }

  /**
   * グループロール一覧を取得（Keycloak固有機能）
   */
  async listGroupRoles(groupId: string): Promise<{
    success: boolean;
    roles?: KeycloakRole[];
    error?: string;
  }> {
    return this.client.listGroupRoles(groupId);
  }

  /**
   * グループロールを削除（Keycloak固有機能）
   */
  async deleteGroupRole(
    groupId: string,
    roleName: string,
  ): Promise<{ success: boolean; error?: string }> {
    return this.client.deleteGroupRole(groupId, roleName);
  }

  /**
   * ユーザーにグループロールを割り当て（Keycloak固有機能）
   */
  async assignGroupRoleToUser(
    groupId: string,
    userId: string,
    roleName: string,
  ): Promise<{ success: boolean; error?: string }> {
    return this.client.assignGroupRoleToUser(groupId, userId, roleName);
  }

  /**
   * ユーザーからグループロールを削除（Keycloak固有機能）
   */
  async removeGroupRoleFromUser(
    groupId: string,
    userId: string,
    roleName: string,
  ): Promise<{ success: boolean; error?: string }> {
    return this.client.removeGroupRoleFromUser(groupId, userId, roleName);
  }

  /**
   * ユーザーのデフォルト組織を設定（Keycloak固有機能）
   * ユーザーのカスタム属性に default_organization_id を保存
   */
  async setUserDefaultOrganization(params: {
    userId: string;
    organizationId: string;
  }): Promise<{ success: boolean; error?: string }> {
    return this.client.updateUserAttributes(params.userId, {
      default_organization_id: [params.organizationId],
    });
  }
}
