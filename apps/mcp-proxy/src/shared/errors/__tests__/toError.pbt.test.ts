/**
 * toError ユーティリティの Property-Based Testing
 *
 * テストするプロパティ:
 * - 任意の値が Error オブジェクトに変換される
 * - Error オブジェクトはそのまま返される
 * - 戻り値は常に Error インスタンス
 */

import { describe, test, expect } from "vitest";
import * as fc from "fast-check";
import { toError } from "../toError.js";
import {
  errorArbitrary,
  nonErrorArbitrary,
  anyValueArbitrary,
} from "../../../test-utils/arbitraries.js";

describe("toError", () => {
  describe("Error オブジェクトの処理", () => {
    test("Error オブジェクトはそのまま返される", () => {
      fc.assert(
        fc.property(errorArbitrary, (error) => {
          const result = toError(error);
          expect(result).toBe(error); // 同一オブジェクト参照
        }),
        { numRuns: 50 },
      );
    });

    test("Error のサブクラスもそのまま返される", () => {
      const errorClasses = [
        TypeError,
        RangeError,
        SyntaxError,
        ReferenceError,
        EvalError,
        URIError,
      ];

      errorClasses.forEach((ErrorClass) => {
        const error = new ErrorClass("test message");
        const result = toError(error);
        expect(result).toBe(error);
        expect(result).toBeInstanceOf(ErrorClass);
      });
    });

    test("カスタムエラークラスもそのまま返される", () => {
      class CustomError extends Error {
        constructor(
          message: string,
          public readonly code: number,
        ) {
          super(message);
          this.name = "CustomError";
        }
      }

      fc.assert(
        fc.property(fc.string(), fc.integer(), (message, code) => {
          const customError = new CustomError(message, code);
          const result = toError(customError);
          expect(result).toBe(customError);
          expect(result).toBeInstanceOf(CustomError);
          expect((result as CustomError).code).toStrictEqual(code);
        }),
        { numRuns: 20 },
      );
    });
  });

  describe("非 Error 値の変換", () => {
    test("文字列は Error に変換される", () => {
      fc.assert(
        fc.property(fc.string(), (str) => {
          const result = toError(str);
          expect(result).toBeInstanceOf(Error);
          expect(result.message).toStrictEqual(str);
        }),
        { numRuns: 50 },
      );
    });

    test("数値は Error に変換される", () => {
      fc.assert(
        fc.property(fc.oneof(fc.integer(), fc.double()), (num) => {
          const result = toError(num);
          expect(result).toBeInstanceOf(Error);
          expect(result.message).toStrictEqual(String(num));
        }),
        { numRuns: 50 },
      );
    });

    test("null は Error に変換される", () => {
      const result = toError(null);
      expect(result).toBeInstanceOf(Error);
      expect(result.message).toStrictEqual("null");
    });

    test("undefined は Error に変換される", () => {
      const result = toError(undefined);
      expect(result).toBeInstanceOf(Error);
      expect(result.message).toStrictEqual("undefined");
    });

    test("boolean は Error に変換される", () => {
      [true, false].forEach((bool) => {
        const result = toError(bool);
        expect(result).toBeInstanceOf(Error);
        expect(result.message).toStrictEqual(String(bool));
      });
    });

    test("オブジェクトは Error に変換される", () => {
      // 注意: toString がオーバーライドされたオブジェクトや
      // null プロトタイプオブジェクトは String() で変換できない
      // ここでは通常のオブジェクトリテラルのみテスト
      const normalObjects = [
        { key: "value" },
        { a: 1, b: 2 },
        { nested: { inner: "test" } },
        {},
      ];

      normalObjects.forEach((obj) => {
        const result = toError(obj);
        expect(result).toBeInstanceOf(Error);
        expect(result.message).toStrictEqual("[object Object]");
      });
    });

    test("配列は Error に変換される", () => {
      // 単純な配列のみテスト（toString がオーバーライドされた要素を避ける）
      const simpleArrays = [
        [1, 2, 3],
        ["a", "b", "c"],
        [true, false],
        [],
        [null],
        [1, "mixed", true],
      ];

      simpleArrays.forEach((arr) => {
        const result = toError(arr);
        expect(result).toBeInstanceOf(Error);
        expect(result.message).toStrictEqual(String(arr));
      });
    });

    test("非 Error 値は新しい Error インスタンスとして返される", () => {
      fc.assert(
        fc.property(nonErrorArbitrary, (value) => {
          const result = toError(value);
          expect(result).toBeInstanceOf(Error);
          // 元の値とは異なるオブジェクト
          expect(result).not.toBe(value);
        }),
        { numRuns: 100 },
      );
    });
  });

  describe("戻り値の保証", () => {
    test("任意の入力に対して常に Error インスタンスを返す", () => {
      fc.assert(
        fc.property(anyValueArbitrary, (value) => {
          const result = toError(value);
          expect(result).toBeInstanceOf(Error);
        }),
        { numRuns: 100 },
      );
    });

    test("戻り値の message は常に文字列", () => {
      fc.assert(
        fc.property(anyValueArbitrary, (value) => {
          const result = toError(value);
          expect(typeof result.message).toStrictEqual("string");
        }),
        { numRuns: 100 },
      );
    });

    test("戻り値の name は常に文字列", () => {
      fc.assert(
        fc.property(anyValueArbitrary, (value) => {
          const result = toError(value);
          expect(typeof result.name).toStrictEqual("string");
        }),
        { numRuns: 100 },
      );
    });
  });

  describe("境界条件", () => {
    test("空文字列を正しく処理する", () => {
      const result = toError("");
      expect(result).toBeInstanceOf(Error);
      expect(result.message).toStrictEqual("");
    });

    test("Symbol を正しく処理する", () => {
      const sym = Symbol("test");
      const result = toError(sym);
      expect(result).toBeInstanceOf(Error);
      expect(result.message).toContain("Symbol");
    });

    test("BigInt を正しく処理する", () => {
      const big = BigInt(9007199254740991);
      const result = toError(big);
      expect(result).toBeInstanceOf(Error);
      expect(result.message).toStrictEqual("9007199254740991");
    });

    test("関数を正しく処理する", () => {
      const fn = () => "test";
      const result = toError(fn);
      expect(result).toBeInstanceOf(Error);
      expect(typeof result.message).toStrictEqual("string");
    });

    test("循環参照を持つオブジェクトを処理できる", () => {
      const obj: { self?: unknown } = {};
      obj.self = obj;
      const result = toError(obj);
      expect(result).toBeInstanceOf(Error);
      // String(obj) が [object Object] になる
      expect(result.message).toStrictEqual("[object Object]");
    });

    test("Error with cause を正しく処理する", () => {
      const cause = new Error("original error");
      // ES2022 の cause オプションを使用
      const errorWithCause = Object.assign(new Error("wrapped error"), {
        cause,
      });
      const result = toError(errorWithCause);
      expect(result).toBe(errorWithCause);
      expect((result as Error & { cause?: Error }).cause).toBe(cause);
    });
  });

  describe("idempotency（冪等性）", () => {
    test("toError を複数回適用しても結果は変わらない", () => {
      fc.assert(
        fc.property(anyValueArbitrary, (value) => {
          const once = toError(value);
          const twice = toError(once);
          // Error インスタンスは変換されないので、同じ参照
          expect(twice).toBe(once);
        }),
        { numRuns: 100 },
      );
    });
  });
});
