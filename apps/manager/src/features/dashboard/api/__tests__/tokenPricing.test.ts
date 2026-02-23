import { describe, test, expect } from "vitest";
import { calculateTokenCost, TOKEN_PRICING } from "../tokenPricing";

describe("tokenPricing", () => {
  describe("TOKEN_PRICING", () => {
    test("デフォルトの単価が設定されている", () => {
      expect(TOKEN_PRICING.inputCostPer1K).toBe(0.01);
      expect(TOKEN_PRICING.outputCostPer1K).toBe(0.03);
    });
  });

  describe("calculateTokenCost", () => {
    test("入力・出力トークンからコストを計算する", () => {
      // 1000 input tokens = $0.01, 1000 output tokens = $0.03 => $0.04
      expect(calculateTokenCost(1000, 1000)).toBe(0.04);
    });

    test("ゼロトークンの場合は0を返す", () => {
      expect(calculateTokenCost(0, 0)).toBe(0);
    });

    test("入力のみの場合は入力コストのみ計算する", () => {
      // 10000 input tokens = $0.10
      expect(calculateTokenCost(10000, 0)).toBe(0.1);
    });

    test("出力のみの場合は出力コストのみ計算する", () => {
      // 10000 output tokens = $0.30
      expect(calculateTokenCost(0, 10000)).toBe(0.3);
    });

    test("大量のトークンでも正確に計算する", () => {
      // 1,000,000 input = $10.00, 500,000 output = $15.00 => $25.00
      expect(calculateTokenCost(1_000_000, 500_000)).toBe(25);
    });

    test("小数点2桁で丸められる", () => {
      // 333 input = $0.00333, 333 output = $0.00999 => $0.01332 -> $0.01
      expect(calculateTokenCost(333, 333)).toBe(0.01);
    });

    test("端数が正しく丸められる", () => {
      // 1500 input = $0.015, 1500 output = $0.045 => $0.06
      expect(calculateTokenCost(1500, 1500)).toBe(0.06);
    });
  });
});
