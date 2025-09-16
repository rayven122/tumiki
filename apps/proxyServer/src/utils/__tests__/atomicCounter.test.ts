import { describe, test, expect } from "vitest";
import { AtomicCounter } from "../atomicCounter.js";

describe("AtomicCounter", () => {
  test("初期値は0である", () => {
    const counter = new AtomicCounter();
    expect(counter.get()).toBe(0);
  });

  test("incrementで値が1増加する", async () => {
    const counter = new AtomicCounter();
    const result = await counter.increment();

    expect(result).toBe(1);
    expect(counter.get()).toBe(1);
  });

  test("decrementで値が1減少する", async () => {
    const counter = new AtomicCounter();
    await counter.increment();
    await counter.increment();

    const result = await counter.decrement();

    expect(result).toBe(1);
    expect(counter.get()).toBe(1);
  });

  test("resetで値が指定値に設定される", async () => {
    const counter = new AtomicCounter();
    await counter.increment();
    await counter.increment();
    await counter.increment();

    await counter.reset(10);

    expect(counter.get()).toBe(10);
  });

  test("resetで引数なしの場合は0に設定される", async () => {
    const counter = new AtomicCounter();
    await counter.increment();
    await counter.increment();

    await counter.reset();

    expect(counter.get()).toBe(0);
  });

  test("複数の操作を順序正しく実行する", async () => {
    const counter = new AtomicCounter();

    await counter.increment(); // 1
    await counter.increment(); // 2
    await counter.decrement(); // 1
    await counter.increment(); // 2
    await counter.increment(); // 3

    expect(counter.get()).toBe(3);
  });

  test("並行操作時の整合性を確認", async () => {
    const counter = new AtomicCounter();
    const promises = [];

    // 10回のincrementを並行実行
    for (let i = 0; i < 10; i++) {
      promises.push(counter.increment());
    }

    await Promise.all(promises);

    expect(counter.get()).toBe(10);
  });

  test("increment/decrementの混在操作の整合性", async () => {
    const counter = new AtomicCounter();
    const incrementPromises = [];
    const decrementPromises = [];

    // 15回のincrementと5回のdecrementを並行実行
    for (let i = 0; i < 15; i++) {
      incrementPromises.push(counter.increment());
    }
    for (let i = 0; i < 5; i++) {
      decrementPromises.push(counter.decrement());
    }

    await Promise.all([...incrementPromises, ...decrementPromises]);

    expect(counter.get()).toBe(10); // 15 - 5 = 10
  });
});
