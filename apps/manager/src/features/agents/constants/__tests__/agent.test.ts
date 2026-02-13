import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { calculateProgress, ESTIMATED_DURATION_BUFFER_MS } from "../agent";

describe("calculateProgress", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: false });
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  describe("正常系", () => {
    test("経過時間に応じた進捗率を返す", () => {
      // 現在時刻を固定
      const now = new Date("2024-01-01T12:00:00Z");
      vi.setSystemTime(now);

      // 5秒前に開始、推定時間10秒
      const createdAt = new Date("2024-01-01T11:59:55Z");
      const estimatedDurationMs = 10000;

      const result = calculateProgress(createdAt, estimatedDurationMs);

      // 経過5秒 / (推定10秒 + バッファ10秒) = 5/20 = 25%
      expect(result).toBe(25);
    });

    test("進捗率は99%を超えない", () => {
      const now = new Date("2024-01-01T12:00:00Z");
      vi.setSystemTime(now);

      // 1分前に開始、推定時間1秒（明らかに超過）
      const createdAt = new Date("2024-01-01T11:59:00Z");
      const estimatedDurationMs = 1000;

      const result = calculateProgress(createdAt, estimatedDurationMs);

      expect(result).toBe(99);
    });

    test("開始直後は0に近い進捗率を返す", () => {
      const now = new Date("2024-01-01T12:00:00Z");
      vi.setSystemTime(now);

      // ちょうど今開始
      const createdAt = new Date("2024-01-01T12:00:00Z");
      const estimatedDurationMs = 10000;

      const result = calculateProgress(createdAt, estimatedDurationMs);

      expect(result).toBe(0);
    });
  });

  describe("バリデーション", () => {
    test("無効な日付の場合は0を返す", () => {
      const invalidDate = new Date("invalid");
      const estimatedDurationMs = 10000;

      const result = calculateProgress(invalidDate, estimatedDurationMs);

      expect(result).toBe(0);
    });

    test("未来の日付（負の経過時間）の場合は0を返す", () => {
      const now = new Date("2024-01-01T12:00:00Z");
      vi.setSystemTime(now);

      // 未来の時刻
      const futureDate = new Date("2024-01-01T12:00:30Z");
      const estimatedDurationMs = 10000;

      const result = calculateProgress(futureDate, estimatedDurationMs);

      expect(result).toBe(0);
    });

    test("estimatedDurationMsが0の場合はバッファのみで計算", () => {
      const now = new Date("2024-01-01T12:00:00Z");
      vi.setSystemTime(now);

      // 5秒前に開始
      const createdAt = new Date("2024-01-01T11:59:55Z");
      const estimatedDurationMs = 0;

      const result = calculateProgress(createdAt, estimatedDurationMs);

      // 経過5秒 / バッファ10秒 = 50%
      expect(result).toBe(50);
    });

    test("estimatedDurationMsが負の値の場合はバッファのみで計算", () => {
      const now = new Date("2024-01-01T12:00:00Z");
      vi.setSystemTime(now);

      // 5秒前に開始
      const createdAt = new Date("2024-01-01T11:59:55Z");
      const estimatedDurationMs = -5000;

      const result = calculateProgress(createdAt, estimatedDurationMs);

      // 負の値は0として扱われる
      // 経過5秒 / バッファ10秒 = 50%
      expect(result).toBe(50);
    });
  });

  describe("定数の検証", () => {
    test("ESTIMATED_DURATION_BUFFER_MSは10秒", () => {
      expect(ESTIMATED_DURATION_BUFFER_MS).toBe(10000);
    });
  });
});
