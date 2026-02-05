import { describe, expect, test } from "vitest";

import {
  DYNAMIC_SEARCH_AVAILABLE,
  DYNAMIC_SEARCH_META_TOOLS,
  isMetaTool,
} from "../index.js";

describe("dynamicSearch CE facade", () => {
  test("DYNAMIC_SEARCH_AVAILABLEはfalse", () => {
    expect(DYNAMIC_SEARCH_AVAILABLE).toBe(false);
  });

  test("DYNAMIC_SEARCH_META_TOOLSは空配列", () => {
    expect(DYNAMIC_SEARCH_META_TOOLS).toStrictEqual([]);
  });

  test("isMetaToolは常にfalseを返す", () => {
    expect(isMetaTool("search_tools")).toBe(false);
    expect(isMetaTool("describe_tools")).toBe(false);
    expect(isMetaTool("execute_tool")).toBe(false);
    expect(isMetaTool("any_tool")).toBe(false);
  });
});
