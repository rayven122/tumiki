import type {
  IOrganizationProvider,
  KeycloakAdminConfig,
  KeycloakGroup,
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
   * voidを返す操作用のラッパー
   * 例外を { success, error } 形式に変換
   */
  private async execute(
    operation: () => Promise<void>,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await operation();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * 値を返す操作用のラッパー
   * 例外を { success, result, error } 形式に変換
   */
  private async executeWithResult<T>(
    operation: () => Promise<T>,
  ): Promise<{ success: boolean; result?: T; error?: string }> {
    try {
      const result = await operation();
      return { success: true, result };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
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
    const result = await this.executeWithResult(() =>
      services.createOrganization(this.client, params, async (memberParams) => {
        const memberResult = await this.addMember(memberParams);
        if (!memberResult.success) {
          throw new Error(memberResult.error ?? "Failed to add member");
        }
      }),
    );
    return {
      success: result.success,
      externalId: result.result ?? "",
      error: result.error,
    };
  }

  /**
   * 組織グループを削除
   */
  async deleteOrganization(params: {
    externalId: string;
  }): Promise<{ success: boolean; error?: string }> {
    return this.execute(() => services.deleteOrganization(this.client, params));
  }

  /**
   * ユーザーを組織に追加
   */
  async addMember(params: {
    externalId: string;
    userId: string;
    role: OrganizationRole;
  }): Promise<{ success: boolean; error?: string }> {
    return this.execute(() => services.addMember(this.client, params));
  }

  /**
   * ユーザーを組織から削除
   */
  async removeMember(params: {
    externalId: string;
    userId: string;
  }): Promise<{ success: boolean; error?: string }> {
    return this.execute(() => services.removeMember(this.client, params));
  }

  /**
   * ユーザーのロールを更新
   */
  async updateMemberRole(params: {
    externalId: string;
    userId: string;
    newRole: OrganizationRole;
  }): Promise<{ success: boolean; error?: string }> {
    return this.execute(() => services.updateMemberRole(this.client, params));
  }

  /**
   * ユーザーのセッションを無効化
   */
  async invalidateUserSessions(params: {
    userId: string;
  }): Promise<{ success: boolean; error?: string }> {
    return this.execute(() =>
      services.invalidateUserSessions(this.client, params),
    );
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
    const result = await this.executeWithResult(() =>
      this.client.createGroupRole(groupId, params),
    );
    return {
      success: result.success,
      roleId: result.result,
      error: result.error,
    };
  }

  /**
   * グループロール一覧を取得（Keycloak固有機能）
   */
  async listGroupRoles(groupId: string): Promise<{
    success: boolean;
    roles?: KeycloakRole[];
    error?: string;
  }> {
    const result = await this.executeWithResult(() =>
      this.client.listGroupRoles(groupId),
    );
    return {
      success: result.success,
      roles: result.result,
      error: result.error,
    };
  }

  /**
   * グループロールを削除（Keycloak固有機能）
   */
  async deleteGroupRole(
    groupId: string,
    roleName: string,
  ): Promise<{ success: boolean; error?: string }> {
    return this.execute(() => this.client.deleteGroupRole(groupId, roleName));
  }

  /**
   * ユーザーにグループロールを割り当て（Keycloak固有機能）
   */
  async assignGroupRoleToUser(
    groupId: string,
    userId: string,
    roleName: string,
  ): Promise<{ success: boolean; error?: string }> {
    return this.execute(() =>
      this.client.assignGroupRoleToUser(groupId, userId, roleName),
    );
  }

  /**
   * ユーザーからグループロールを削除（Keycloak固有機能）
   */
  async removeGroupRoleFromUser(
    groupId: string,
    userId: string,
    roleName: string,
  ): Promise<{ success: boolean; error?: string }> {
    return this.execute(() =>
      this.client.removeGroupRoleFromUser(groupId, userId, roleName),
    );
  }

  /**
   * ユーザーのデフォルト組織を設定（Keycloak固有機能）
   * ユーザーのカスタム属性に default_organization_id を保存
   */
  async setUserDefaultOrganization(params: {
    userId: string;
    organizationId: string;
  }): Promise<{ success: boolean; error?: string }> {
    return this.execute(() =>
      this.client.updateUserAttributes(params.userId, {
        default_organization_id: [params.organizationId],
      }),
    );
  }

  /**
   * サブグループ（部署）を作成
   */
  async createSubgroup(params: {
    organizationId: string;
    name: string;
    parentSubgroupId?: string;
  }): Promise<{ success: boolean; subgroupId: string; error?: string }> {
    const result = await this.executeWithResult(() =>
      this.client.createSubgroup(
        params.parentSubgroupId ?? params.organizationId,
        { name: params.name },
      ),
    );
    return {
      success: result.success,
      subgroupId: result.result ?? "",
      error: result.error,
    };
  }

  /**
   * サブグループを削除
   */
  async deleteSubgroup(params: {
    subgroupId: string;
  }): Promise<{ success: boolean; error?: string }> {
    return this.execute(() => this.client.deleteSubgroup(params.subgroupId));
  }

  /**
   * サブグループ一覧を取得
   */
  async listSubgroups(params: { organizationId: string }): Promise<{
    success: boolean;
    subgroups?: KeycloakGroup[];
    error?: string;
  }> {
    const result = await this.executeWithResult(() =>
      this.client.listSubgroups(params.organizationId),
    );
    return {
      success: result.success,
      subgroups: result.result,
      error: result.error,
    };
  }

  /**
   * ユーザーをサブグループに追加
   */
  async addUserToSubgroup(params: {
    subgroupId: string;
    userId: string;
  }): Promise<{ success: boolean; error?: string }> {
    return this.execute(() =>
      this.client.addUserToGroup(params.userId, params.subgroupId),
    );
  }

  /**
   * ユーザーをサブグループから削除
   */
  async removeUserFromSubgroup(params: {
    subgroupId: string;
    userId: string;
  }): Promise<{ success: boolean; error?: string }> {
    return this.execute(() =>
      this.client.removeUserFromGroup(params.userId, params.subgroupId),
    );
  }
}
