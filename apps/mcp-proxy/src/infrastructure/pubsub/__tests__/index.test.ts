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

  test("PUBSUB_MCP_LOGS_TOPIC設定時にtopicオブジェクトを返す", async () => {
    vi.stubEnv("PUBSUB_MCP_LOGS_TOPIC", "mcp-request-logs-test");

    // PubSubのモックを設定
    vi.doMock("@google-cloud/pubsub", () => ({
      PubSub: vi.fn().mockImplementation(() => ({
        topic: vi.fn().mockReturnValue({ name: "mcp-request-logs-test" }),
      })),
    }));

    const { getMcpLogsTopic } = await import("../index.js");

    const topic = getMcpLogsTopic();
    expect(topic).not.toBeNull();
  });

  test("2回目の呼び出しでキャッシュされたtopicを返す", async () => {
    vi.stubEnv("PUBSUB_MCP_LOGS_TOPIC", "mcp-logs-cached");

    vi.doMock("@google-cloud/pubsub", () => ({
      PubSub: vi.fn().mockImplementation(() => ({
        topic: vi.fn().mockReturnValue({ name: "mcp-logs-cached" }),
      })),
    }));

    const { getMcpLogsTopic } = await import("../index.js");

    const topic1 = getMcpLogsTopic();
    const topic2 = getMcpLogsTopic();
    expect(topic1).toBe(topic2);
  });

  test("2回目の呼び出しでPubSubコンストラクタは1回のみ呼ばれる", async () => {
    vi.stubEnv("PUBSUB_MCP_LOGS_TOPIC", "mcp-logs-pubsub-cache");

    const MockPubSub = vi.fn().mockImplementation(() => ({
      topic: vi.fn().mockReturnValue({ name: "mcp-logs-pubsub-cache" }),
    }));

    vi.doMock("@google-cloud/pubsub", () => ({
      PubSub: MockPubSub,
    }));

    const { getMcpLogsTopic } = await import("../index.js");

    getMcpLogsTopic();
    getMcpLogsTopic();

    // PubSub コンストラクタは1回のみ呼ばれる（キャッシュが使用される）
    expect(MockPubSub).toHaveBeenCalledTimes(1);
  });

  test("topicがfalsyを返す場合でもPubSubクライアントはキャッシュされる", async () => {
    vi.stubEnv("PUBSUB_MCP_LOGS_TOPIC", "mcp-logs-falsy-topic");

    const mockTopic = vi.fn().mockReturnValue(null);
    const MockPubSub = vi.fn().mockImplementation(() => ({
      topic: mockTopic,
    }));

    vi.doMock("@google-cloud/pubsub", () => ({
      PubSub: MockPubSub,
    }));

    const { getMcpLogsTopic } = await import("../index.js");

    // 1回目: pubsubClient未作成 → 新規作成、topicがnullを返す → mcpLogsTopicInstanceはnull
    getMcpLogsTopic();
    // 2回目: mcpLogsTopicInstanceがnull（falsy）→ getPubSubClient()が呼ばれる
    //        → pubsubClientがキャッシュされているのでそのまま返す（lines 18-20）
    getMcpLogsTopic();

    // PubSubコンストラクタは1回のみ（pubsubClientキャッシュヒット）
    expect(MockPubSub).toHaveBeenCalledTimes(1);
    // topicは2回呼ばれる（mcpLogsTopicInstanceがfalsyなので毎回呼ばれる）
    expect(mockTopic).toHaveBeenCalledTimes(2);
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
