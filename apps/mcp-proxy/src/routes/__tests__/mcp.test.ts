import { describe, test, expect, vi } from "vitest";

// モック関数を事前定義
const mocks = vi.hoisted(() => {
  const createPassthroughMiddleware = () =>
    vi.fn(async (_c: unknown, next: () => Promise<void>) => {
      await next();
    });

  return {
    authMiddleware: createPassthroughMiddleware(),
    piiMaskingMiddleware: createPassthroughMiddleware(),
    toonConversionMiddleware: createPassthroughMiddleware(),
    mcpRequestLoggingMiddleware: createPassthroughMiddleware(),
    mcpHandler: vi.fn((c: { json: (body: unknown) => Response }) =>
      c.json({ result: "ok" }),
    ),
  };
});

// 外部モジュールをモック
vi.mock("../../middleware/auth/index.js", () => ({
  authMiddleware: mocks.authMiddleware,
}));

vi.mock("../../middleware/piiMasking/index.js", () => ({
  piiMaskingMiddleware: mocks.piiMaskingMiddleware,
}));

vi.mock("../../middleware/toonConversion/index.js", () => ({
  toonConversionMiddleware: mocks.toonConversionMiddleware,
}));

vi.mock("../../middleware/requestLogging/index.js", () => ({
  mcpRequestLoggingMiddleware: mocks.mcpRequestLoggingMiddleware,
}));

vi.mock("../../handlers/mcpHandler.js", () => ({
  mcpHandler: mocks.mcpHandler,
}));

import { mcpRoute } from "../mcp.js";

describe("mcpRoute", () => {
  test("mcpRouteが定義されている", () => {
    expect(mcpRoute).toBeDefined();
  });

  test("POST /mcp/:mcpServerIdルートがステータス200を返す", async () => {
    const res = await mcpRoute.request("/mcp/test-server-id", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ test: true }),
    });

    expect(res.status).toBe(200);
  });

  test("mcpServerIdなしのパスは404を返す", async () => {
    const res = await mcpRoute.request("/mcp/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ test: true }),
    });

    expect(res.status).toBe(404);
  });

  test("GETメソッドは404を返す", async () => {
    const res = await mcpRoute.request("/mcp/test-server-id", {
      method: "GET",
    });

    expect(res.status).toBe(404);
  });

  test("DELETEメソッドは404を返す", async () => {
    const res = await mcpRoute.request("/mcp/test-server-id", {
      method: "DELETE",
    });

    expect(res.status).toBe(404);
  });

  test("各ミドルウェアがPOSTリクエストで呼ばれる", async () => {
    Object.values(mocks).forEach((mock) => mock.mockClear());

    await mcpRoute.request("/mcp/test-server-id", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ test: true }),
    });

    expect(mocks.mcpRequestLoggingMiddleware).toHaveBeenCalled();
    expect(mocks.authMiddleware).toHaveBeenCalled();
    expect(mocks.piiMaskingMiddleware).toHaveBeenCalled();
    expect(mocks.toonConversionMiddleware).toHaveBeenCalled();
  });

  test("mcpHandlerがPOSTリクエストで呼ばれる", async () => {
    mocks.mcpHandler.mockClear();

    await mcpRoute.request("/mcp/test-server-id", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ test: true }),
    });

    expect(mocks.mcpHandler).toHaveBeenCalled();
  });
});
