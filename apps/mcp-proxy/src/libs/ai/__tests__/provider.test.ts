import { describe, test, expect, vi } from "vitest";

vi.mock("ai", () => ({
  gateway: "mocked-gateway",
}));

import { gateway, DYNAMIC_SEARCH_MODEL } from "../provider.js";

describe("provider", () => {
  test("gatewayがエクスポートされる", () => {
    expect(gateway).toBeDefined();
  });

  test("DYNAMIC_SEARCH_MODELがanthropicモデルである", () => {
    expect(DYNAMIC_SEARCH_MODEL).toBe("anthropic/claude-3.5-haiku");
  });
});
