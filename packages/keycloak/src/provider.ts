import type {
  IOrganizationProvider,
  KeycloakAdminConfig,
  OrganizationRole,
} from "./types.js";
import { KeycloakAdminClient } from "./client.js";
import * as services from "./services/index.js";

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
}
