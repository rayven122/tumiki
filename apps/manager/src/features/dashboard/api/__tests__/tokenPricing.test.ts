import { describe, test, expect } from "vitest";
import {
  calculateTokenCost,
  calculateTokenCostByModel,
  getModelPricing,
  TOKEN_PRICING,
  MODEL_PRICING,
} from "../tokenPricing";

describe("tokenPricing", () => {
  describe("TOKEN_PRICING", () => {
    test("デフォルトの単価が設定されている", () => {
      expect(TOKEN_PRICING.inputCostPer1K).toBe(0.01);
      expect(TOKEN_PRICING.outputCostPer1K).toBe(0.03);
    });
  });

  describe("MODEL_PRICING", () => {
    test("全モデルの単価が定義されている", () => {
      const expectedModels = [
        "anthropic/claude-opus-4.5",
        "anthropic/claude-sonnet-4.5",
        "anthropic/claude-haiku-4.5",
        "anthropic/claude-sonnet-4",
        "anthropic/claude-3.5-sonnet",
        "anthropic/claude-3.5-haiku",
        "openai/gpt-4o",
        "openai/gpt-4o-mini",
        "google/gemini-2.5-flash",
        "google/gemini-2.5-pro",
        "google/gemini-2.0-flash",
        "xai/grok-4.1-fast-non-reasoning",
      ];

      for (const modelId of expectedModels) {
        expect(MODEL_PRICING.has(modelId)).toBe(true);
      }
    });

    test("各モデルの単価が正の数である", () => {
      for (const [, pricing] of MODEL_PRICING) {
        expect(pricing.inputCostPer1K).toBeGreaterThan(0);
        expect(pricing.outputCostPer1K).toBeGreaterThan(0);
      }
    });
  });

  describe("getModelPricing", () => {
    test("既知のモデルIDで正しい単価を返す", () => {
      const pricing = getModelPricing("anthropic/claude-opus-4.5");
      expect(pricing).toStrictEqual({
        inputCostPer1K: 0.015,
        outputCostPer1K: 0.075,
      });
    });

    test("前方一致でバージョン付きモデルIDにマッチする", () => {
      const pricing = getModelPricing("anthropic/claude-opus-4.5-20250101");
      expect(pricing).toStrictEqual({
        inputCostPer1K: 0.015,
        outputCostPer1K: 0.075,
      });
    });

    test("nullの場合はデフォルト単価を返す", () => {
      const pricing = getModelPricing(null);
      expect(pricing).toStrictEqual(TOKEN_PRICING);
    });

    test("undefinedの場合はデフォルト単価を返す", () => {
      const pricing = getModelPricing(undefined);
      expect(pricing).toStrictEqual(TOKEN_PRICING);
    });

    test("'auto'の場合はデフォルト単価を返す", () => {
      const pricing = getModelPricing("auto");
      expect(pricing).toStrictEqual(TOKEN_PRICING);
    });

    test("未知のモデルIDの場合はデフォルト単価を返す", () => {
      const pricing = getModelPricing("unknown/model-xyz");
      expect(pricing).toStrictEqual(TOKEN_PRICING);
    });

    test("空文字列の場合はデフォルト単価を返す", () => {
      const pricing = getModelPricing("");
      expect(pricing).toStrictEqual(TOKEN_PRICING);
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

  describe("calculateTokenCostByModel", () => {
    test("既知のモデルでモデル別単価が適用される", () => {
      // openai/gpt-4o: input=$0.0025/1K, output=$0.01/1K
      // 1000 input = $0.0025, 1000 output = $0.01 => $0.0125 -> $0.01
      expect(calculateTokenCostByModel("openai/gpt-4o", 1000, 1000)).toBe(0.01);
    });

    test("nullの場合はデフォルト単価で計算される", () => {
      expect(calculateTokenCostByModel(null, 1000, 1000)).toBe(
        calculateTokenCost(1000, 1000),
      );
    });

    test("未知モデルの場合はデフォルト単価で計算される", () => {
      expect(calculateTokenCostByModel("unknown/model", 1000, 1000)).toBe(
        calculateTokenCost(1000, 1000),
      );
    });

    test("GPT-4o-miniの低単価が正しく適用される", () => {
      // openai/gpt-4o-mini: input=$0.00015/1K, output=$0.0006/1K
      // 10000 input = $0.0015, 10000 output = $0.006 => $0.0075 -> $0.01
      expect(
        calculateTokenCostByModel("openai/gpt-4o-mini", 10000, 10000),
      ).toBe(0.01);
    });

    test("Claude Opus 4.5の高単価が正しく適用される", () => {
      // anthropic/claude-opus-4.5: input=$0.015/1K, output=$0.075/1K
      // 1000 input = $0.015, 1000 output = $0.075 => $0.09
      expect(
        calculateTokenCostByModel("anthropic/claude-opus-4.5", 1000, 1000),
      ).toBe(0.09);
    });

    test("ゼロトークンの場合は0を返す", () => {
      expect(calculateTokenCostByModel("anthropic/claude-opus-4.5", 0, 0)).toBe(
        0,
      );
    });
  });
});
