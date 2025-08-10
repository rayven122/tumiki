/**
 * OAuth認可コードマッピングのメモリストア
 * 本番環境ではRedisなどの永続ストレージを推奨
 */

interface CodeMapping {
  code: string;
  originalClientId: string;
  originalRedirectUri: string;
  timestamp: number;
}

class OAuthMemoryStore {
  private codeMappings = new Map<string, CodeMapping>();
  private readonly CODE_EXPIRY_MS = 5 * 60 * 1000; // 5分

  /**
   * コードマッピングを保存
   */
  setCodeMapping(code: string, mapping: Omit<CodeMapping, "timestamp">): void {
    const fullMapping: CodeMapping = {
      ...mapping,
      code,
      timestamp: Date.now(),
    };

    this.codeMappings.set(code, fullMapping);

    // 自動削除のタイマーを設定
    setTimeout(() => {
      this.codeMappings.delete(code);
    }, this.CODE_EXPIRY_MS);
  }

  /**
   * コードマッピングを取得
   */
  getCodeMapping(code: string): CodeMapping | undefined {
    const mapping = this.codeMappings.get(code);

    if (!mapping) {
      return undefined;
    }

    // 有効期限をチェック
    if (Date.now() - mapping.timestamp > this.CODE_EXPIRY_MS) {
      this.codeMappings.delete(code);
      return undefined;
    }

    return mapping;
  }

  /**
   * コードマッピングを削除
   */
  deleteCodeMapping(code: string): void {
    this.codeMappings.delete(code);
  }

  /**
   * 期限切れのマッピングをクリーンアップ
   */
  cleanupExpired(): void {
    const now = Date.now();
    for (const [code, mapping] of this.codeMappings.entries()) {
      if (now - mapping.timestamp > this.CODE_EXPIRY_MS) {
        this.codeMappings.delete(code);
      }
    }
  }

  /**
   * ストアをクリア
   */
  clear(): void {
    this.codeMappings.clear();
  }

  /**
   * 現在のマッピング数を取得
   */
  get size(): number {
    return this.codeMappings.size;
  }
}

// シングルトンインスタンスをエクスポート
export const oauthStore = new OAuthMemoryStore();

// 定期的なクリーンアップ（10分ごと）
setInterval(
  () => {
    oauthStore.cleanupExpired();
  },
  10 * 60 * 1000,
);
