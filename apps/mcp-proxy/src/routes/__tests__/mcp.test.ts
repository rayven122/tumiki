import { describe, test, expect, vi } from "vitest";

// ミドルウェアとハンドラーのモック
vi.mock("../../middleware/auth/index.js", () => ({
  authMiddleware: vi.fn(async (_c: unknown, next: () => Promise<void>) => {
    await next();
  }),
}));

vi.mock("../../middleware/piiMasking/index.js", () => ({
  piiMaskingMiddleware: vi.fn(
    async (_c: unknown, next: () => Promise<void>) => {
      await next();
    },
  ),
}));

vi.mock("../../middleware/toonConversion/index.js", () => ({
  toonConversionMiddleware: vi.fn(
    async (_c: unknown, next: () => Promise<void>) => {
      await next();
    },
  ),
}));

vi.mock("../../middleware/requestLogging/index.js", () => ({
  mcpRequestLoggingMiddleware: vi.fn(
    async (_c: unknown, next: () => Promise<void>) => {
      await next();
    },
  ),
}));

vi.mock("../../handlers/mcpHandler.js", () => ({
  mcpHandler: vi.fn((c: { json: (body: unknown) => Response }) =>
    c.json({ result: "ok" }),
  ),
}));

import { mcpRoute } from "../mcp.js";

describe("mcpRoute", () => {
  test("mcpRouteが定義されている", () => {
    expect(mcpRoute).toBeDefined();
  });

  test("POST /mcp/:mcpServerIdルートが処理される", async () => {
    const res = await mcpRoute.request("/mcp/test-server-id", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ test: true }),
    });

    expect(res).toBeDefined();
  });
});
