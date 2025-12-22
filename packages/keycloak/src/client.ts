import type GroupRepresentation from "@keycloak/keycloak-admin-client/lib/defs/groupRepresentation.js";
import type RoleRepresentation from "@keycloak/keycloak-admin-client/lib/defs/roleRepresentation.js";
import type UserRepresentation from "@keycloak/keycloak-admin-client/lib/defs/userRepresentation.js";
import KcAdminClient from "@keycloak/keycloak-admin-client";

import type { KeycloakAdminConfig, OrganizationRole } from "./types.js";
import * as operations from "./clientOperations.js";

/**
 * Keycloak Admin APIクライアント
 * 公式の @keycloak/keycloak-admin-client をラップし、
 * 組織管理に特化したシンプルなインターフェースを提供
 */
export class KeycloakAdminClient {
  private config: KeycloakAdminConfig;
  private client: KcAdminClient;
  private authPromise?: Promise<void>;
  private lastAuthTime = 0;
  private readonly AUTH_CACHE_DURATION = 50000; // 50秒（トークン有効期限60秒より短く設定）

  constructor(config: KeycloakAdminConfig) {
    this.config = config;
    // admin-cli クライアントは master realm にのみ存在するため、
    // 初期化時は master realm を指定
    this.client = new KcAdminClient({
      baseUrl: config.baseUrl,
      realmName: "master",
    });
  }

  /**
   * 401エラーかどうかを判定
   */
  private is401Error(error: unknown): boolean {
    if (error && typeof error === "object") {
      // Keycloak Admin Client のエラーオブジェクトから401を検出
      const errorObj = error as {
        response?: { status?: number };
        status?: number;
        message?: string;
      };

      // HTTPステータスコードが401の場合
      if (errorObj.response?.status === 401 || errorObj.status === 401) {
        return true;
      }

      // エラーメッセージに "401" または "Unauthorized" が含まれる場合
      if (errorObj.message) {
        const msg = errorObj.message.toLowerCase();
        if (msg.includes("401") || msg.includes("unauthorized")) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * 認証キャッシュを強制的にクリア
   */
  private clearAuthCache(): void {
    this.authPromise = undefined;
    this.lastAuthTime = 0;
  }

  /**
   * 管理者として認証（キャッシュ付き）
   * トークンの有効期限（デフォルト60秒）を考慮し、50秒間キャッシュ
   * これにより、トークン期限切れによる401エラーを防ぎつつパフォーマンスを改善
   */
  private async ensureAuth(forceRefresh = false): Promise<void> {
    const now = Date.now();

    // 強制リフレッシュが指定された場合、キャッシュをクリア
    if (forceRefresh) {
      this.clearAuthCache();
    }

    // 既に有効な認証がある場合はスキップ
    if (
      this.authPromise &&
      now - this.lastAuthTime < this.AUTH_CACHE_DURATION
    ) {
      return this.authPromise;
    }

    this.authPromise = this.performAuth();
    this.lastAuthTime = now;
    return this.authPromise;
  }

  /**
   * 認証処理の実行
   */
  private async performAuth(): Promise<void> {
    try {
      // master realm で認証（admin-cli クライアントは master realm にのみ存在）
      await this.client.auth({
        username: this.config.adminUsername,
        password: this.config.adminPassword,
        grantType: "password",
        clientId: "admin-cli",
      });

      // 認証後、対象レルム（tumiki）に切り替え
      this.client.setConfig({
        realmName: this.config.realm,
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * 操作を実行し、401エラー時に自動再認証してリトライ
   */
  private async executeWithAutoRetry<T>(
    operation: () => Promise<T>,
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      // 401エラーの場合、認証キャッシュをクリアして再認証後にリトライ
      if (this.is401Error(error)) {
        await this.ensureAuth(true); // 強制再認証
        return await operation(); // リトライ
      }
      // 401以外のエラーはそのまま再スロー
      throw error;
    }
  }

  /**
   * グループを作成（フラット構造）
   */
  async createGroup(params: {
    name: string;
    attributes?: Record<string, string[]>;
  }): Promise<string> {
    await this.ensureAuth();
    const result = await this.executeWithAutoRetry(() =>
      operations.createGroup(this.client, params),
    );
    return result.groupId;
  }

  /**
   * グループを削除
   */
  async deleteGroup(groupId: string): Promise<void> {
    await this.ensureAuth();
    await this.executeWithAutoRetry(() =>
      operations.deleteGroup(this.client, groupId),
    );
  }

  /**
   * サブグループを作成
   */
  async createSubgroup(
    parentGroupId: string,
    params: {
      name: string;
      attributes?: Record<string, string[]>;
    },
  ): Promise<string> {
    await this.ensureAuth();
    const result = await this.executeWithAutoRetry(() =>
      operations.createSubgroup(this.client, parentGroupId, params),
    );
    return result.subgroupId;
  }

  /**
   * サブグループを削除
   */
  async deleteSubgroup(subgroupId: string): Promise<void> {
    await this.ensureAuth();
    await this.executeWithAutoRetry(() =>
      operations.deleteSubgroup(this.client, subgroupId),
    );
  }

  /**
   * サブグループ一覧を取得
   */
  async listSubgroups(parentGroupId: string): Promise<GroupRepresentation[]> {
    await this.ensureAuth();
    return this.executeWithAutoRetry(() =>
      operations.listSubgroups(this.client, parentGroupId),
    );
  }

  /**
   * ユーザーをグループに追加
   */
  async addUserToGroup(userId: string, groupId: string): Promise<void> {
    await this.ensureAuth();
    await this.executeWithAutoRetry(() =>
      operations.addUserToGroup(this.client, userId, groupId),
    );
  }

  /**
   * ユーザーをグループから削除
   */
  async removeUserFromGroup(userId: string, groupId: string): Promise<void> {
    await this.ensureAuth();
    await this.executeWithAutoRetry(() =>
      operations.removeUserFromGroup(this.client, userId, groupId),
    );
  }

  /**
   * Realm Roleを取得
   */
  async getRealmRole(roleName: OrganizationRole): Promise<RoleRepresentation> {
    await this.ensureAuth();
    return this.executeWithAutoRetry(() =>
      operations.getRealmRole(this.client, roleName),
    );
  }

  /**
   * ユーザーにRealm Roleを割り当て
   */
  async assignRealmRole(
    userId: string,
    role: RoleRepresentation,
  ): Promise<void> {
    await this.ensureAuth();
    await this.executeWithAutoRetry(() =>
      operations.assignRealmRole(this.client, userId, role),
    );
  }

  /**
   * ユーザーからRealm Roleを削除
   */
  async removeRealmRole(
    userId: string,
    role: RoleRepresentation,
  ): Promise<void> {
    await this.ensureAuth();
    await this.executeWithAutoRetry(() =>
      operations.removeRealmRole(this.client, userId, role),
    );
  }

  /**
   * ユーザーの現在のRealm Rolesを取得
   */
  async getUserRealmRoles(userId: string): Promise<RoleRepresentation[]> {
    await this.ensureAuth();
    return this.executeWithAutoRetry(() =>
      operations.getUserRealmRoles(this.client, userId),
    );
  }

  /**
   * ユーザーの全セッションを無効化
   */
  async invalidateUserSessions(userId: string): Promise<void> {
    await this.ensureAuth();
    await this.executeWithAutoRetry(() =>
      operations.invalidateUserSessions(this.client, userId),
    );
  }

  /**
   * グループ情報を取得
   */
  async getGroup(groupId: string): Promise<GroupRepresentation> {
    await this.ensureAuth();
    return this.executeWithAutoRetry(() =>
      operations.getGroup(this.client, groupId),
    );
  }

  /**
   * グループロールを作成
   */
  async createGroupRole(
    groupId: string,
    params: {
      name: string;
      description?: string;
      attributes?: Record<string, string[]>;
    },
  ): Promise<string> {
    await this.ensureAuth();
    const result = await this.executeWithAutoRetry(() =>
      operations.createGroupRole(this.client, groupId, params),
    );
    return result.roleId;
  }

  /**
   * グループロール一覧を取得
   */
  async listGroupRoles(groupId: string): Promise<RoleRepresentation[]> {
    await this.ensureAuth();
    return this.executeWithAutoRetry(() =>
      operations.listGroupRoles(this.client, groupId),
    );
  }

  /**
   * グループロールを削除
   */
  async deleteGroupRole(groupId: string, roleName: string): Promise<void> {
    await this.ensureAuth();
    await this.executeWithAutoRetry(() =>
      operations.deleteGroupRole(this.client, groupId, roleName),
    );
  }

  /**
   * ユーザーにグループロールを割り当て
   */
  async assignGroupRoleToUser(
    groupId: string,
    userId: string,
    roleName: string,
  ): Promise<void> {
    await this.ensureAuth();
    await this.executeWithAutoRetry(() =>
      operations.assignGroupRoleToUser(this.client, groupId, userId, roleName),
    );
  }

  /**
   * ユーザーからグループロールを削除
   */
  async removeGroupRoleFromUser(
    groupId: string,
    userId: string,
    roleName: string,
  ): Promise<void> {
    await this.ensureAuth();
    await this.executeWithAutoRetry(() =>
      operations.removeGroupRoleFromUser(
        this.client,
        groupId,
        userId,
        roleName,
      ),
    );
  }

  /**
   * ユーザーのカスタム属性を更新
   */
  async updateUserAttributes(
    userId: string,
    attributes: Record<string, string[]>,
  ): Promise<void> {
    await this.ensureAuth();
    await this.executeWithAutoRetry(() =>
      operations.updateUserAttributes(this.client, userId, attributes),
    );
  }

  /**
   * グループのメンバー一覧を取得
   */
  async listGroupMembers(groupId: string): Promise<UserRepresentation[]> {
    await this.ensureAuth();
    return this.executeWithAutoRetry(() =>
      operations.listGroupMembers(this.client, groupId),
    );
  }
}
