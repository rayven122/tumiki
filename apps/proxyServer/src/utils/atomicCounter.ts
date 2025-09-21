/**
 * @fileoverview 同期カウンター実装
 * Node.jsのシングルスレッド特性を活用した軽量カウンター
 */

/**
 * 同期カウンター
 * Node.jsのイベントループ特性により、同期メソッドは原子的に実行される
 */
export class AtomicCounter {
  private value = 0;

  /**
   * カウンターをインクリメント
   * @returns 更新後の値
   */
  increment(): number {
    return ++this.value;
  }

  /**
   * カウンターをデクリメント
   * @returns 更新後の値
   */
  decrement(): number {
    return --this.value;
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
  reset(newValue = 0): void {
    this.value = newValue;
  }
}
