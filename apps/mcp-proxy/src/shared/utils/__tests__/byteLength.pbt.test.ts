/**
 * UTF-8バイト長計算のProperty-Based Testing
 */

import { describe, test, expect } from "vitest";
import * as fc from "fast-check";
import { byteLength } from "../byteLength.js";

describe("byteLength", () => {
  test("常に非負の整数を返す", () => {
    fc.assert(
      fc.property(fc.string(), (text) => {
        const result = byteLength(text);

        expect(result).toBeGreaterThanOrEqual(0);
        expect(Number.isInteger(result)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  test("Buffer.byteLengthと一致する", () => {
    fc.assert(
      fc.property(fc.string(), (text) => {
        const result = byteLength(text);
        const expected = Buffer.byteLength(text, "utf8");

        expect(result).toBe(expected);
      }),
      { numRuns: 100 },
    );
  });

  test("空文字列は0を返す", () => {
    expect(byteLength("")).toBe(0);
  });

  test("ASCII文字列は文字数と等しい", () => {
    const asciiArbitrary = fc
      .array(fc.integer({ min: 0, max: 127 }))
      .map((codes) => String.fromCharCode(...codes));

    fc.assert(
      fc.property(asciiArbitrary, (text) => {
        const result = byteLength(text);

        expect(result).toBe(text.length);
      }),
      { numRuns: 100 },
    );
  });

  test("マルチバイト文字は文字数より大きいバイト数を返す", () => {
    const japaneseChars = "あいうえお漢字カタカナ";
    const result = byteLength(japaneseChars);

    expect(result).toBeGreaterThan(japaneseChars.length);
  });

  test("Unicode文字列を正しく処理する", () => {
    fc.assert(
      fc.property(fc.string({ unit: "grapheme" }), (text) => {
        const result = byteLength(text);
        const expected = Buffer.byteLength(text, "utf8");

        expect(result).toBe(expected);
      }),
      { numRuns: 100 },
    );
  });

  test("絵文字を正しく処理する", () => {
    fc.assert(
      fc.property(fc.string({ unit: "grapheme-composite" }), (text) => {
        const result = byteLength(text);
        const expected = Buffer.byteLength(text, "utf8");

        expect(result).toBe(expected);
      }),
      { numRuns: 100 },
    );
  });

  test("既知の値に対する期待値", () => {
    expect(byteLength("hello")).toBe(5);
    expect(byteLength("あ")).toBe(3);
    expect(byteLength("あいう")).toBe(9);
    expect(byteLength("😀")).toBe(4);
    expect(byteLength("Hello世界")).toBe(11);
  });

  test("文字列の結合: byteLength(a + b) === byteLength(a) + byteLength(b)", () => {
    fc.assert(
      fc.property(fc.string(), fc.string(), (a, b) => {
        const combined = byteLength(a + b);
        const separate = byteLength(a) + byteLength(b);

        expect(combined).toBe(separate);
      }),
      { numRuns: 100 },
    );
  });

  test("決定論的: 同じ入力は常に同じ出力を返す", () => {
    fc.assert(
      fc.property(fc.string(), (text) => {
        const result1 = byteLength(text);
        const result2 = byteLength(text);

        expect(result1).toBe(result2);
      }),
      { numRuns: 100 },
    );
  });
});
