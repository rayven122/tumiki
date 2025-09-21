import { describe, test, expect } from "vitest";
import { AtomicCounter } from "../atomicCounter.js";

describe("AtomicCounter", () => {
  test("初期値は0である", () => {
    const counter = new AtomicCounter();
    expect(counter.get()).toStrictEqual(0);
  });

  test("incrementで値が1増加する", () => {
    const counter = new AtomicCounter();
    const result = counter.increment();
    expect(result).toStrictEqual(1);
    expect(counter.get()).toStrictEqual(1);
  });

  test("decrementで値が1減少する", () => {
    const counter = new AtomicCounter();
    counter.increment();
    counter.increment();
    const result = counter.decrement();
    expect(result).toStrictEqual(1);
    expect(counter.get()).toStrictEqual(1);
  });

  test("resetで値が0に設定される", () => {
    const counter = new AtomicCounter();
    counter.increment();
    counter.increment();
    counter.reset();
    expect(counter.get()).toStrictEqual(0);
  });

  test("resetで特定の値に設定される", () => {
    const counter = new AtomicCounter();
    counter.reset(10);
    expect(counter.get()).toStrictEqual(10);
  });

  test("複数の操作を順序正しく実行する", () => {
    const counter = new AtomicCounter();
    counter.increment(); // 1
    counter.increment(); // 2
    counter.decrement(); // 1
    counter.increment(); // 2
    counter.increment(); // 3
    expect(counter.get()).toStrictEqual(3);
  });
});
