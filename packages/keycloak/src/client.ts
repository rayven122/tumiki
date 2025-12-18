import type GroupRepresentation from "@keycloak/keycloak-admin-client/lib/defs/groupRepresentation.js";
import type RoleRepresentation from "@keycloak/keycloak-admin-client/lib/defs/roleRepresentation.js";
import KcAdminClient from "@keycloak/keycloak-admin-client";

import type { KeycloakAdminConfig, OrganizationRole } from "./types.js";
import * as operations from "./operations/index.js";

/**
 * Keycloak Admin APIクライアント
 * 公式の @keycloak/keycloak-admin-client をラップし、
 * 組織管理に特化したシンプルなインターフェースを提供
 */
export class KeycloakAdminClient {
  private config: KeycloakAdminConfig;
  private client: KcAdminClient;

  constructor(config: KeycloakAdminConfig) {
    this.config = config;
    this.client = new KcAdminClient({
      baseUrl: config.baseUrl,
      realmName: config.realm,
    });
  }

  /**
   * 管理者として認証
   * 公式クライアントは自動的にトークンを管理
   */
  private async ensureAuth(): Promise<void> {
    await this.client.auth({
      username: this.config.adminUsername,
      password: this.config.adminPassword,
      grantType: "password",
      clientId: "admin-cli",
    });
  }

  /**
   * グループを作成（フラット構造）
   */
  async createGroup(params: {
    name: string;
    attributes?: Record<string, string[]>;
  }): Promise<{ success: boolean; groupId?: string; error?: string }> {
    await this.ensureAuth();
    return operations.createGroup(this.client, params);
  }

  /**
   * グループを削除
   */
  async deleteGroup(
    groupId: string,
  ): Promise<{ success: boolean; error?: string }> {
    await this.ensureAuth();
    return operations.deleteGroup(this.client, groupId);
  }

  /**
   * ユーザーをグループに追加
   */
  async addUserToGroup(
    userId: string,
    groupId: string,
  ): Promise<{ success: boolean; error?: string }> {
    await this.ensureAuth();
    return operations.addUserToGroup(this.client, userId, groupId);
  }

  /**
   * ユーザーをグループから削除
   */
  async removeUserFromGroup(
    userId: string,
    groupId: string,
  ): Promise<{ success: boolean; error?: string }> {
    await this.ensureAuth();
    return operations.removeUserFromGroup(this.client, userId, groupId);
  }

  /**
   * Realm Roleを取得
   */
  async getRealmRole(roleName: OrganizationRole): Promise<{
    success: boolean;
    role?: RoleRepresentation;
    error?: string;
  }> {
    await this.ensureAuth();
    return operations.getRealmRole(this.client, roleName);
  }

  /**
   * ユーザーにRealm Roleを割り当て
   */
  async assignRealmRole(
    userId: string,
    role: RoleRepresentation,
  ): Promise<{ success: boolean; error?: string }> {
    await this.ensureAuth();
    return operations.assignRealmRole(this.client, userId, role);
  }

  /**
   * ユーザーからRealm Roleを削除
   */
  async removeRealmRole(
    userId: string,
    role: RoleRepresentation,
  ): Promise<{ success: boolean; error?: string }> {
    await this.ensureAuth();
    return operations.removeRealmRole(this.client, userId, role);
  }

  /**
   * ユーザーの現在のRealm Rolesを取得
   */
  async getUserRealmRoles(userId: string): Promise<{
    success: boolean;
    roles?: RoleRepresentation[];
    error?: string;
  }> {
    await this.ensureAuth();
    return operations.getUserRealmRoles(this.client, userId);
  }

  /**
   * ユーザーの全セッションを無効化
   */
  async invalidateUserSessions(
    userId: string,
  ): Promise<{ success: boolean; error?: string }> {
    await this.ensureAuth();
    return operations.invalidateUserSessions(this.client, userId);
  }

  /**
   * グループ情報を取得
   */
  async getGroup(groupId: string): Promise<{
    success: boolean;
    group?: GroupRepresentation;
    error?: string;
  }> {
    await this.ensureAuth();
    return operations.getGroup(this.client, groupId);
  }
}
