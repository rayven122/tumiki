import type { Server } from "node:http";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../shared/utils/logger", () => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));

vi.mock("../ai-coding-telemetry.receiver", () => ({
  OTLP_DEFAULT_PORT: 4318,
  startOtlpReceiver: vi.fn(),
}));

import {
  createAnalyticsMcpResponse,
  startAnalyticsReceiverSingleton,
} from "../ai-coding-telemetry.analytics-sidecar";
import { startOtlpReceiver } from "../ai-coding-telemetry.receiver";

describe("createAnalyticsMcpResponse", () => {
  const runtime = {
    receiverStarted: true,
    receiverListening: true,
    server: null,
  };

  test("initialize は tumiki-analytics の MCP serverInfo を返す", () => {
    expect(
      createAnalyticsMcpResponse(
        {
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: { protocolVersion: "2025-03-26" },
        },
        runtime,
      ),
    ).toStrictEqual({
      jsonrpc: "2.0",
      id: 1,
      result: {
        protocolVersion: "2025-03-26",
        capabilities: { tools: {} },
        serverInfo: {
          name: "tumiki-analytics",
          version: "0.1.0",
        },
      },
    });
  });

  test("tools/list は空の tools を返す", () => {
    expect(
      createAnalyticsMcpResponse(
        { jsonrpc: "2.0", id: "tools", method: "tools/list" },
        runtime,
      ),
    ).toStrictEqual({
      jsonrpc: "2.0",
      id: "tools",
      result: { tools: [] },
    });
  });

  test("tumiki/analytics/status は固定ポートと起動状態を返す", () => {
    expect(
      createAnalyticsMcpResponse(
        { jsonrpc: "2.0", id: "status", method: "tumiki/analytics/status" },
        { receiverStarted: false, receiverListening: true, server: null },
      ),
    ).toStrictEqual({
      jsonrpc: "2.0",
      id: "status",
      result: {
        port: 4318,
        receiverStarted: false,
        listening: true,
      },
    });
  });

  test("notification はレスポンスを返さない", () => {
    expect(
      createAnalyticsMcpResponse(
        { jsonrpc: "2.0", method: "notifications/initialized" },
        runtime,
      ),
    ).toBeNull();
  });

  test("未知の method は JSON-RPC error を返す", () => {
    expect(
      createAnalyticsMcpResponse(
        { jsonrpc: "2.0", id: null, method: "unknown" },
        runtime,
      ),
    ).toStrictEqual({
      jsonrpc: "2.0",
      id: null,
      error: { code: -32601, message: "Method not found: unknown" },
    });
  });
});

describe("startAnalyticsReceiverSingleton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(process.stderr, "write").mockImplementation(() => true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("4318 で fallback なしの OTLP receiver を起動する", async () => {
    const server = { close: vi.fn() } as unknown as Server;
    vi.mocked(startOtlpReceiver).mockResolvedValueOnce({
      port: 4318,
      server,
    });

    await expect(startAnalyticsReceiverSingleton()).resolves.toStrictEqual({
      receiverStarted: true,
      receiverListening: true,
      server,
    });
    expect(startOtlpReceiver).toHaveBeenCalledWith(4318, {
      allowFallback: false,
    });
    expect(process.stderr.write).toHaveBeenCalledWith(
      "[tumiki-analytics] OTLP receiver started on 127.0.0.1:4318\n",
    );
  });

  test("4318 が使用中なら既存 receiver とみなし二重起動しない", async () => {
    const error = new Error("listen EADDRINUSE") as NodeJS.ErrnoException;
    error.code = "EADDRINUSE";
    vi.mocked(startOtlpReceiver).mockRejectedValueOnce(error);

    await expect(startAnalyticsReceiverSingleton()).resolves.toStrictEqual({
      receiverStarted: false,
      receiverListening: true,
      server: null,
    });
    expect(process.stderr.write).toHaveBeenCalledWith(
      "[tumiki-analytics] OTLP receiver already running on 127.0.0.1:4318\n",
    );
  });

  test("EADDRINUSE 以外の起動失敗は呼び出し元へ返す", async () => {
    const error = new Error("boom");
    vi.mocked(startOtlpReceiver).mockRejectedValueOnce(error);

    await expect(startAnalyticsReceiverSingleton()).rejects.toThrow("boom");
  });
});
