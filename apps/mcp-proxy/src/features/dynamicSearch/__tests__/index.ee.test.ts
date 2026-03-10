// SPDX-License-Identifier: Elastic-2.0
// Copyright (c) 2024-2025 Reyven Inc.

import { describe, expect, test } from "vitest";

import {
  DYNAMIC_SEARCH_META_TOOLS,
  isMetaTool,
  SearchToolsArgsSchema,
  DescribeToolsArgsSchema,
  CallToolRequestParamsSchema,
} from "../index.ee.js";

describe("dynamicSearch EE エントリーポイント", () => {
  test("メタツール定義がre-exportされている", () => {
    expect(DYNAMIC_SEARCH_META_TOOLS).toBeDefined();
    expect(DYNAMIC_SEARCH_META_TOOLS.length).toBeGreaterThan(0);
  });

  test("isMetaToolがre-exportされている", () => {
    expect(isMetaTool("search_tools")).toBe(true);
    expect(isMetaTool("unknown_tool")).toBe(false);
  });

  test("バリデーションスキーマがre-exportされている", () => {
    expect(SearchToolsArgsSchema).toBeDefined();
    expect(DescribeToolsArgsSchema).toBeDefined();
    expect(CallToolRequestParamsSchema).toBeDefined();
  });
});
