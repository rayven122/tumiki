import { describe, test, expect, beforeEach } from "vitest";
import { AtomicCounter } from "../atomicCounter.js";

describe("AtomicCounter", () => {
  let counter: AtomicCounter;

  beforeEach(() => {
    counter = new AtomicCounter();
  });

  describe("初期化", () => {
    test("初期値が0であること", () => {
      expect(counter.get()).toStrictEqual(0);
    });
  });

  describe("increment", () => {
    test("値が1増加すること", () => {
      const result = counter.increment();
      expect(result).toStrictEqual(1);
      expect(counter.get()).toStrictEqual(1);
    });

    test("複数回インクリメントが正しく動作すること", () => {
      counter.increment();
      counter.increment();
      const result = counter.increment();
      expect(result).toStrictEqual(3);
      expect(counter.get()).toStrictEqual(3);
    });

    test("インクリメント後の値を返すこと", () => {
      const result1 = counter.increment();
      const result2 = counter.increment();
      expect(result1).toStrictEqual(1);
      expect(result2).toStrictEqual(2);
    });
  });

  describe("decrement", () => {
    test("値が1減少すること", () => {
      counter.increment(); // 1にする
      const result = counter.decrement();
      expect(result).toStrictEqual(0);
      expect(counter.get()).toStrictEqual(0);
    });

    test("負の値にも対応すること", () => {
      const result = counter.decrement();
      expect(result).toStrictEqual(-1);
      expect(counter.get()).toStrictEqual(-1);
    });

    test("デクリメント後の値を返すこと", () => {
      counter.increment(); // 1
      counter.increment(); // 2
      const result1 = counter.decrement(); // 1
      const result2 = counter.decrement(); // 0
      expect(result1).toStrictEqual(1);
      expect(result2).toStrictEqual(0);
    });
  });

  describe("get", () => {
    test("現在の値を正しく返すこと", () => {
      expect(counter.get()).toStrictEqual(0);
      counter.increment();
      expect(counter.get()).toStrictEqual(1);
      counter.increment();
      expect(counter.get()).toStrictEqual(2);
      counter.decrement();
      expect(counter.get()).toStrictEqual(1);
    });

    test("getは値を変更しないこと", () => {
      counter.increment();
      const value1 = counter.get();
      const value2 = counter.get();
      expect(value1).toStrictEqual(value2);
      expect(value1).toStrictEqual(1);
    });
  });

  describe("reset", () => {
    test("値を0にリセットすること", () => {
      counter.increment();
      counter.increment();
      counter.reset();
      expect(counter.get()).toStrictEqual(0);
    });

    test("特定の値にリセットできること", () => {
      counter.increment();
      counter.reset(10);
      expect(counter.get()).toStrictEqual(10);
    });

    test("負の値にもリセットできること", () => {
      counter.reset(-5);
      expect(counter.get()).toStrictEqual(-5);
    });
  });

  describe("同期的な動作の検証", () => {
    test("連続したインクリメント操作が正しく動作すること", () => {
      const results: number[] = [];
      for (let i = 0; i < 1000; i++) {
        results.push(counter.increment());
      }

      // 各結果が連続した数値であることを確認
      for (let i = 0; i < results.length; i++) {
        expect(results[i]).toStrictEqual(i + 1);
      }

      expect(counter.get()).toStrictEqual(1000);
    });

    test("インクリメントとデクリメントの混在操作が正しく動作すること", () => {
      const operations = [
        () => counter.increment(),
        () => counter.increment(),
        () => counter.decrement(),
        () => counter.increment(),
        () => counter.decrement(),
        () => counter.decrement(),
        () => counter.increment(),
      ];

      const results = operations.map((op) => op());

      // 期待される結果: 1, 2, 1, 2, 1, 0, 1
      expect(results).toStrictEqual([1, 2, 1, 2, 1, 0, 1]);
      expect(counter.get()).toStrictEqual(1);
    });

    test("大量の操作でも一貫性が保たれること", () => {
      const increments = 5000;
      const decrements = 3000;

      for (let i = 0; i < increments; i++) {
        counter.increment();
      }

      for (let i = 0; i < decrements; i++) {
        counter.decrement();
      }

      expect(counter.get()).toStrictEqual(increments - decrements);
    });

    test("リセット後の操作が正しく動作すること", () => {
      counter.increment();
      counter.increment();
      counter.reset(100);

      const afterReset1 = counter.increment();
      const afterReset2 = counter.decrement();
      const afterReset3 = counter.decrement();

      expect(afterReset1).toStrictEqual(101);
      expect(afterReset2).toStrictEqual(100);
      expect(afterReset3).toStrictEqual(99);
      expect(counter.get()).toStrictEqual(99);
    });
  });

  describe("エッジケース", () => {
    test("最大値付近での動作", () => {
      const maxSafeInt = Number.MAX_SAFE_INTEGER;
      counter.reset(maxSafeInt - 1);

      const result = counter.increment();
      expect(result).toStrictEqual(maxSafeInt);
      expect(counter.get()).toStrictEqual(maxSafeInt);
    });

    test("最小値付近での動作", () => {
      const minSafeInt = Number.MIN_SAFE_INTEGER;
      counter.reset(minSafeInt + 1);

      const result = counter.decrement();
      expect(result).toStrictEqual(minSafeInt);
      expect(counter.get()).toStrictEqual(minSafeInt);
    });

    test("ゼロを跨ぐ操作", () => {
      counter.reset(2);
      counter.decrement(); // 1
      counter.decrement(); // 0
      const belowZero = counter.decrement(); // -1
      const furtherBelow = counter.decrement(); // -2

      expect(belowZero).toStrictEqual(-1);
      expect(furtherBelow).toStrictEqual(-2);
      expect(counter.get()).toStrictEqual(-2);
    });
  });
});
