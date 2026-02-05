/**
 * Property-Based Testing for logger/sanitize.ts
 *
 * 機密情報のハッシュ化関数をPBTでテスト
 */

import { describe, test, expect } from "vitest";
import * as fc from "fast-check";
import { sanitizeIdForLog } from "../sanitize.js";

describe("sanitizeIdForLog", () => {
  test("常に8文字の文字列を返す", () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        const result = sanitizeIdForLog(input);

        expect(result).toHaveLength(8);
      }),
      { numRuns: 1000 },
    );
  });

  test("常に16進数のみで構成される", () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        const result = sanitizeIdForLog(input);

        // 0-9 と a-f のみを含む
        expect(result).toMatch(/^[0-9a-f]{8}$/);
      }),
      { numRuns: 1000 },
    );
  });

  test("決定論的: 同じ入力は常に同じ出力を返す", () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        const result1 = sanitizeIdForLog(input);
        const result2 = sanitizeIdForLog(input);

        expect(result1).toBe(result2);
      }),
      { numRuns: 1000 },
    );
  });

  test("異なる入力は（高確率で）異なる出力を返す", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        fc.string({ minLength: 1 }),
        (input1, input2) => {
          // 同じ入力の場合はスキップ
          fc.pre(input1 !== input2);

          const result1 = sanitizeIdForLog(input1);
          const result2 = sanitizeIdForLog(input2);

          // SHA-256の先頭8文字なので衝突は稀（2^32に1回程度）
          expect(result1).not.toBe(result2);
        },
      ),
      { numRuns: 1000 },
    );
  });

  test("空文字列を処理できる", () => {
    const result = sanitizeIdForLog("");

    expect(result).toHaveLength(8);
    expect(result).toMatch(/^[0-9a-f]{8}$/);
  });

  test("Unicode文字列を正しく処理できる", () => {
    fc.assert(
      fc.property(fc.string({ unit: "grapheme" }), (input) => {
        const result = sanitizeIdForLog(input);

        expect(result).toHaveLength(8);
        expect(result).toMatch(/^[0-9a-f]{8}$/);
      }),
      { numRuns: 500 },
    );
  });

  test("非常に長い文字列を処理できる", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1000, maxLength: 10000 }), (input) => {
        const result = sanitizeIdForLog(input);

        expect(result).toHaveLength(8);
        expect(result).toMatch(/^[0-9a-f]{8}$/);
      }),
      { numRuns: 50 },
    );
  });

  test("特定の既知の値に対する期待値（スナップショット的検証）", () => {
    // 空文字列のSHA-256の先頭8文字
    // SHA256("") = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    expect(sanitizeIdForLog("")).toBe("e3b0c442");

    // "test"のSHA-256の先頭8文字
    // SHA256("test") = "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08"
    expect(sanitizeIdForLog("test")).toBe("9f86d081");
  });
});
