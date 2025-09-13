/**
 * @fileoverview 原子的カウンター実装（Race Condition対策）
 */

/**
 * 原子的操作を提供するカウンター
 * Node.js環境でのスレッドセーフカウンター実装
 */
export class AtomicCounter {
  private value = 0;
  private readonly lock = new Set<string>();

  /**
   * カウンターをインクリメント
   * @returns 更新後の値
   */
  async increment(): Promise<number> {
    return this.atomicOperation(() => ++this.value);
  }

  /**
   * カウンターをデクリメント
   * @returns 更新後の値
   */
  async decrement(): Promise<number> {
    return this.atomicOperation(() => --this.value);
  }

  /**
   * 現在の値を取得
   * @returns 現在の値
   */
  get(): number {
    return this.value;
  }

  /**
   * 値をリセット
   * @param newValue 新しい値（デフォルト: 0）
   */
  async reset(newValue = 0): Promise<void> {
    await this.atomicOperation(() => {
      this.value = newValue;
      return this.value;
    });
  }

  /**
   * 原子的操作の実行
   */
  private async atomicOperation<T>(operation: () => T): Promise<T> {
    const operationId = Math.random().toString(36);

    // 簡易的なロック実装（Node.jsのシングルスレッド特性を活用）
    while (this.lock.size > 0) {
      await new Promise((resolve) => setImmediate(resolve));
    }

    this.lock.add(operationId);

    try {
      const result = operation();
      return result;
    } finally {
      this.lock.delete(operationId);
    }
  }
}
