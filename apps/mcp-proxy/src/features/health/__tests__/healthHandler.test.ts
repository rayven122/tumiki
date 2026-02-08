import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { Hono } from "hono";
import { healthHandler } from "../handler.js";
import type { HonoEnv } from "../../../shared/types/honoEnv.js";

vi.mock("../../../shared/logger/index.js", () => ({
  logInfo: vi.fn(),
}));

describe("healthHandler", () => {
  let app: Hono<HonoEnv>;

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: false });
    app = new Hono<HonoEnv>();
    app.get("/health", healthHandler);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe("レスポンス形式", () => {
    test("status: ok を含むJSONレスポンスを返す", async () => {
      const res = await app.request("/health");
      const body = (await res.json()) as { status: string; timestamp: string };

      expect(res.status).toStrictEqual(200);
      expect(body.status).toStrictEqual("ok");
    });

    test("timestamp を含むJSONレスポンスを返す", async () => {
      const fixedDate = new Date("2024-01-15T12:00:00.000Z");
      vi.setSystemTime(fixedDate);

      const res = await app.request("/health");
      const body = (await res.json()) as { status: string; timestamp: string };

      expect(body.timestamp).toStrictEqual("2024-01-15T12:00:00.000Z");
    });

    test("Content-Type が application/json である", async () => {
      const res = await app.request("/health");

      expect(res.headers.get("Content-Type")).toContain("application/json");
    });
  });

  describe("ログ記録", () => {
    test("リクエスト時にログが記録される", async () => {
      const { logInfo } = await import("../../../shared/logger/index.js");

      await app.request("/health", {
        headers: {
          "User-Agent": "test-agent/1.0",
          "X-Forwarded-For": "192.168.1.1",
        },
      });

      expect(logInfo).toHaveBeenCalledWith("Health check accessed", {
        userAgent: "test-agent/1.0",
        ip: "192.168.1.1",
      });
    });

    test("ヘッダーがない場合はundefinedが記録される", async () => {
      const { logInfo } = await import("../../../shared/logger/index.js");

      await app.request("/health");

      expect(logInfo).toHaveBeenCalledWith("Health check accessed", {
        userAgent: undefined,
        ip: undefined,
      });
    });
  });

  describe("HTTPメソッド", () => {
    test("GETリクエストで正常に動作する", async () => {
      const res = await app.request("/health", {
        method: "GET",
      });

      expect(res.status).toStrictEqual(200);
    });
  });
});
