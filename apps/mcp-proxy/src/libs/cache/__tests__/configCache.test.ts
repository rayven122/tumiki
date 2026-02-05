import { describe, test, expect, vi } from "vitest";

vi.mock("../../logger/index.js", () => ({
  logInfo: vi.fn(),
}));

import { getCachedConfig, invalidateConfigCache } from "../configCache.js";
import { logInfo } from "../../logger/index.js";

describe("getCachedConfig", () => {
  test("fetchFromDbの結果をそのまま返す", async () => {
    const mockData = [
      { namespace: "test", config: { url: "http://example.com" } },
    ];
    const fetchFromDb = vi.fn().mockResolvedValue(mockData);

    const result = await getCachedConfig("server-123", fetchFromDb as never);

    expect(result).toStrictEqual(mockData);
    expect(fetchFromDb).toHaveBeenCalledTimes(1);
  });
});

describe("invalidateConfigCache", () => {
  test("ログを出力して正常完了する", async () => {
    await invalidateConfigCache("server-123");

    expect(logInfo).toHaveBeenCalledWith(
      "Cache invalidation skipped (cache disabled)",
      { mcpServerId: "server-123" },
    );
  });
});
