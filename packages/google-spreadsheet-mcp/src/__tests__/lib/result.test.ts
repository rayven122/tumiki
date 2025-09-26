import { describe, expect, test } from "vitest";

import {
  err,
  isErr,
  isOk,
  map,
  mapErr,
  ok,
  Result,
  unwrap,
  unwrapOr,
} from "../../lib/result/index.js";

describe("Result型", () => {
  describe("ok関数", () => {
    test("成功の結果を作成できる", () => {
      const result = ok(42);
      expect(result).toStrictEqual({ ok: true, value: 42 });
    });

    test("任意の型の値を保持できる", () => {
      const result = ok({ name: "test", count: 10 });
      expect(result).toStrictEqual({
        ok: true,
        value: { name: "test", count: 10 },
      });
    });
  });

  describe("err関数", () => {
    test("失敗の結果を作成できる", () => {
      const result = err(new Error("test error"));
      expect(result.ok).toBe(false);
      expect((result as any).error.message).toBe("test error");
    });

    test("任意の型のエラーを保持できる", () => {
      const result = err("string error");
      expect(result).toStrictEqual({ ok: false, error: "string error" });
    });
  });

  describe("isOk関数", () => {
    test("成功の結果を正しく判定できる", () => {
      const result = ok(42);
      expect(isOk(result)).toBe(true);
    });

    test("失敗の結果を正しく判定できる", () => {
      const result = err(new Error("test"));
      expect(isOk(result)).toBe(false);
    });
  });

  describe("isErr関数", () => {
    test("失敗の結果を正しく判定できる", () => {
      const result = err(new Error("test"));
      expect(isErr(result)).toBe(true);
    });

    test("成功の結果を正しく判定できる", () => {
      const result = ok(42);
      expect(isErr(result)).toBe(false);
    });
  });

  describe("unwrap関数", () => {
    test("成功の結果から値を取り出せる", () => {
      const result = ok(42);
      expect(unwrap(result)).toBe(42);
    });

    test("失敗の結果でエラーをthrowする", () => {
      const result = err(new Error("test error"));
      expect(() => unwrap(result)).toThrow("test error");
    });
  });

  describe("unwrapOr関数", () => {
    test("成功の結果から値を取り出せる", () => {
      const result = ok(42);
      expect(unwrapOr(result, 0)).toBe(42);
    });

    test("失敗の結果でデフォルト値を返す", () => {
      const result = err(new Error("test"));
      expect(unwrapOr(result, 0)).toBe(0);
    });
  });

  describe("map関数", () => {
    test("成功の結果の値を変換できる", () => {
      const result = ok(42);
      const mapped = map(result, (v) => v * 2);
      expect(mapped).toStrictEqual({ ok: true, value: 84 });
    });

    test("失敗の結果は変換されない", () => {
      const result = err(new Error("test")) as Result<number, Error>;
      const mapped = map(result, (v) => v * 2);
      expect(isErr(mapped)).toBe(true);
      expect((mapped as any).error.message).toBe("test");
    });
  });

  describe("mapErr関数", () => {
    test("失敗の結果のエラーを変換できる", () => {
      const result = err(new Error("test"));
      const mapped = mapErr(result, (e) => new Error(`wrapped: ${e.message}`));
      expect(isErr(mapped)).toBe(true);
      expect((mapped as any).error.message).toBe("wrapped: test");
    });

    test("成功の結果は変換されない", () => {
      const result = ok(42) as Result<number, Error>;
      const mapped = mapErr(result, (e) => new Error("wrapped"));
      expect(mapped).toStrictEqual({ ok: true, value: 42 });
    });
  });
});
