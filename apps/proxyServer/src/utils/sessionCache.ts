import type { SessionInfo } from "./session.js";

/**
 * セッションキャッシュ
 *
 * ユーザーとMCPサーバーインスタンスごとのセッションを高速検索するためのキャッシュ
 * - userMcpServerInstanceIdごとにセッションIDのSetを管理
 * - O(1)でセッションの存在確認が可能
 * - メモリ効率的な実装（セッションIDのみ保持）
 */
export class SessionCache {
  // userMcpServerInstanceId -> Set<sessionId>
  private readonly instanceToSessions = new Map<string, Set<string>>();
  // sessionId -> userMcpServerInstanceId
  private readonly sessionToInstance = new Map<string, string>();

  /**
   * セッションを追加
   */
  add(sessionId: string, userMcpServerInstanceId: string): void {
    // 既存のマッピングがある場合は、古いインスタンスから削除
    const existingInstanceId = this.sessionToInstance.get(sessionId);
    if (existingInstanceId && existingInstanceId !== userMcpServerInstanceId) {
      const oldSessionSet = this.instanceToSessions.get(existingInstanceId);
      if (oldSessionSet) {
        oldSessionSet.delete(sessionId);
        // 空のSetは削除
        if (oldSessionSet.size === 0) {
          this.instanceToSessions.delete(existingInstanceId);
        }
      }
    }

    // instanceToSessionsに追加
    const sessionSet = this.instanceToSessions.get(userMcpServerInstanceId);
    if (sessionSet) {
      sessionSet.add(sessionId);
    } else {
      this.instanceToSessions.set(userMcpServerInstanceId, new Set([sessionId]));
    }

    // sessionToInstanceに追加
    this.sessionToInstance.set(sessionId, userMcpServerInstanceId);
  }

  /**
   * セッションを削除
   */
  remove(sessionId: string): void {
    // sessionToInstanceから削除
    const instanceId = this.sessionToInstance.get(sessionId);
    if (!instanceId) return;

    this.sessionToInstance.delete(sessionId);

    // instanceToSessionsから削除
    const sessionSet = this.instanceToSessions.get(instanceId);
    if (sessionSet) {
      sessionSet.delete(sessionId);

      // 空のSetは削除してメモリを節約
      if (sessionSet.size === 0) {
        this.instanceToSessions.delete(instanceId);
      }
    }
  }

  /**
   * 指定したuserMcpServerInstanceIdのアクティブなセッションIDを取得
   */
  getSessionIds(userMcpServerInstanceId: string): string[] {
    const sessionSet = this.instanceToSessions.get(userMcpServerInstanceId);
    return sessionSet ? Array.from(sessionSet) : [];
  }

  /**
   * 指定したuserMcpServerInstanceIdにアクティブなセッションがあるか確認
   */
  hasActiveSession(userMcpServerInstanceId: string): boolean {
    const sessionSet = this.instanceToSessions.get(userMcpServerInstanceId);
    return sessionSet ? sessionSet.size > 0 : false;
  }

  /**
   * セッションIDから対応するuserMcpServerInstanceIdを取得
   */
  getInstanceId(sessionId: string): string | undefined {
    return this.sessionToInstance.get(sessionId);
  }

  /**
   * 全てクリア
   */
  clear(): void {
    this.instanceToSessions.clear();
    this.sessionToInstance.clear();
  }

  /**
   * キャッシュの統計情報を取得
   */
  getStats(): { instanceCount: number; sessionCount: number } {
    return {
      instanceCount: this.instanceToSessions.size,
      sessionCount: this.sessionToInstance.size,
    };
  }

  /**
   * 指定したuserMcpServerInstanceIdの全セッションを削除
   */
  removeAllForInstance(userMcpServerInstanceId: string): void {
    const sessionSet = this.instanceToSessions.get(userMcpServerInstanceId);
    if (!sessionSet) return;

    // 各セッションをsessionToInstanceからも削除
    for (const sessionId of sessionSet) {
      this.sessionToInstance.delete(sessionId);
    }

    // instanceToSessionsから削除
    this.instanceToSessions.delete(userMcpServerInstanceId);
  }
}

/**
 * グローバルセッションキャッシュインスタンスを作成
 */
export const createSessionCache = (): SessionCache => {
  return new SessionCache();
};