/**
 * ヘルスルートのユニットテスト
 */

import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { healthRoute } from "../route.js";

// ロガーをモック
vi.mock("../../../shared/logger/index.js", () => ({
  logInfo: vi.fn(),
}));

describe("healthRoute", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: false });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe("GET /health", () => {
    test("ステータス200でレスポンスを返す", async () => {
      const res = await healthRoute.request("/health");

      expect(res.status).toStrictEqual(200);
    });

    test("status: ok を含むJSONレスポンスを返す", async () => {
      const res = await healthRoute.request("/health");
      const body = (await res.json()) as { status: string };

      expect(body.status).toStrictEqual("ok");
    });

    test("timestamp を含むJSONレスポンスを返す", async () => {
      const fixedDate = new Date("2024-01-15T12:00:00.000Z");
      vi.setSystemTime(fixedDate);

      const res = await healthRoute.request("/health");
      const body = (await res.json()) as { timestamp: string };

      expect(body.timestamp).toStrictEqual("2024-01-15T12:00:00.000Z");
    });

    test("Content-Type が application/json である", async () => {
      const res = await healthRoute.request("/health");

      expect(res.headers.get("Content-Type")).toContain("application/json");
    });
  });

  describe("その他のHTTPメソッド", () => {
    // Honoはデフォルトで未定義のメソッドに対して404を返す
    test("POSTリクエストは404を返す", async () => {
      const res = await healthRoute.request("/health", {
        method: "POST",
      });

      expect(res.status).toStrictEqual(404);
    });

    test("PUTリクエストは404を返す", async () => {
      const res = await healthRoute.request("/health", {
        method: "PUT",
      });

      expect(res.status).toStrictEqual(404);
    });

    test("DELETEリクエストは404を返す", async () => {
      const res = await healthRoute.request("/health", {
        method: "DELETE",
      });

      expect(res.status).toStrictEqual(404);
    });
  });

  describe("存在しないパス", () => {
    test("存在しないパスは404を返す", async () => {
      const res = await healthRoute.request("/unknown");

      expect(res.status).toStrictEqual(404);
    });
  });
});
