import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * Pub/Subクライアントのテスト
 *
 * 注意: getMcpLogsTopic()のPubSubクライアント統合テストは、
 * mcpLogger.test.tsでモックを通じてテストされています。
 * ここでは環境変数の処理と基本的な動作のみをテストします。
 */

describe("getMcpLogsTopic", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  test("PUBSUB_MCP_LOGS_TOPICが未設定の場合はnullを返す", async () => {
    vi.stubEnv("PUBSUB_MCP_LOGS_TOPIC", "");

    const { getMcpLogsTopic } = await import("../index.js");

    expect(getMcpLogsTopic()).toBeNull();
  });
});

describe("isBigQueryLoggingEnabled", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  test("PUBSUB_MCP_LOGS_TOPICが設定されている場合はtrueを返す", async () => {
    vi.stubEnv("PUBSUB_MCP_LOGS_TOPIC", "mcp-request-logs-dev");

    const { isBigQueryLoggingEnabled } = await import("../index.js");

    expect(isBigQueryLoggingEnabled()).toBe(true);
  });

  test("PUBSUB_MCP_LOGS_TOPICが未設定の場合はfalseを返す", async () => {
    vi.stubEnv("PUBSUB_MCP_LOGS_TOPIC", "");

    const { isBigQueryLoggingEnabled } = await import("../index.js");

    expect(isBigQueryLoggingEnabled()).toBe(false);
  });
});
