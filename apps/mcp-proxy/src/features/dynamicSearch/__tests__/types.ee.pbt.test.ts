// SPDX-License-Identifier: Elastic-2.0
// Copyright (c) 2024-2025 Reyven Inc.

/**
 * Dynamic Search 型定義の Property-Based Testing (EE)
 *
 * テストするプロパティ:
 * - SearchToolsArgsSchema が有効な入力を受け入れる
 * - DescribeToolsArgsSchema が有効な入力を受け入れる
 * - CallToolRequestParamsSchema が有効な入力を受け入れる
 * - 無効な入力は拒否される
 */

import { describe, test, expect } from "vitest";
import * as fc from "fast-check";
import {
  SearchToolsArgsSchema,
  DescribeToolsArgsSchema,
  CallToolRequestParamsSchema,
} from "../types.ee.js";
import {
  searchToolsArgsArbitrary,
  describeToolsArgsArbitrary,
  callToolRequestParamsArbitrary,
} from "../../../test-utils/arbitraries.js";

describe("Dynamic Search Zod Schemas (EE)", () => {
  describe("SearchToolsArgsSchema", () => {
    test("有効な引数を受け入れる", () => {
      fc.assert(
        fc.property(searchToolsArgsArbitrary, (args) => {
          const result = SearchToolsArgsSchema.safeParse(args);
          expect(result.success).toStrictEqual(true);
          if (result.success) {
            expect(result.data.query).toStrictEqual(args.query);
            if (args.limit !== undefined) {
              expect(result.data.limit).toStrictEqual(args.limit);
            }
          }
        }),
        { numRuns: 100 },
      );
    });

    test("query は必須", () => {
      const noQuery = { limit: 10 };
      const result = SearchToolsArgsSchema.safeParse(noQuery);
      expect(result.success).toStrictEqual(false);
    });

    test("query は文字列でなければならない", () => {
      fc.assert(
        fc.property(
          fc.oneof(fc.integer(), fc.boolean(), fc.constant(null)),
          (invalidQuery) => {
            const result = SearchToolsArgsSchema.safeParse({
              query: invalidQuery,
            });
            expect(result.success).toStrictEqual(false);
          },
        ),
        { numRuns: 20 },
      );
    });

    test("limit はオプショナルで数値でなければならない", () => {
      fc.assert(
        fc.property(
          fc.string(),
          fc.oneof(fc.string(), fc.boolean()),
          (query, invalidLimit) => {
            const result = SearchToolsArgsSchema.safeParse({
              query,
              limit: invalidLimit,
            });
            expect(result.success).toStrictEqual(false);
          },
        ),
        { numRuns: 20 },
      );
    });

    test("limit なしでも有効", () => {
      fc.assert(
        fc.property(fc.string(), (query) => {
          const result = SearchToolsArgsSchema.safeParse({ query });
          expect(result.success).toStrictEqual(true);
        }),
        { numRuns: 50 },
      );
    });
  });

  describe("DescribeToolsArgsSchema", () => {
    test("有効な引数を受け入れる", () => {
      fc.assert(
        fc.property(describeToolsArgsArbitrary, (args) => {
          const result = DescribeToolsArgsSchema.safeParse(args);
          expect(result.success).toStrictEqual(true);
          if (result.success) {
            expect(result.data.toolNames).toStrictEqual(args.toolNames);
          }
        }),
        { numRuns: 100 },
      );
    });

    test("toolNames は必須", () => {
      const noToolNames = {};
      const result = DescribeToolsArgsSchema.safeParse(noToolNames);
      expect(result.success).toStrictEqual(false);
    });

    test("toolNames は配列でなければならない", () => {
      fc.assert(
        fc.property(
          fc.oneof(fc.string(), fc.integer(), fc.constant(null)),
          (invalidToolNames) => {
            const result = DescribeToolsArgsSchema.safeParse({
              toolNames: invalidToolNames,
            });
            expect(result.success).toStrictEqual(false);
          },
        ),
        { numRuns: 20 },
      );
    });

    test("toolNames の要素は文字列でなければならない", () => {
      fc.assert(
        fc.property(
          fc.array(fc.oneof(fc.integer(), fc.boolean()), { minLength: 1 }),
          (invalidElements) => {
            const result = DescribeToolsArgsSchema.safeParse({
              toolNames: invalidElements,
            });
            expect(result.success).toStrictEqual(false);
          },
        ),
        { numRuns: 20 },
      );
    });

    test("空の配列も有効", () => {
      const result = DescribeToolsArgsSchema.safeParse({ toolNames: [] });
      expect(result.success).toStrictEqual(true);
    });
  });

  describe("CallToolRequestParamsSchema", () => {
    test("有効な引数を受け入れる", () => {
      fc.assert(
        fc.property(callToolRequestParamsArbitrary, (args) => {
          const result = CallToolRequestParamsSchema.safeParse(args);
          expect(result.success).toStrictEqual(true);
          if (result.success) {
            expect(result.data.name).toStrictEqual(args.name);
            if (args.arguments !== undefined) {
              expect(result.data.arguments).toStrictEqual(args.arguments);
            }
          }
        }),
        { numRuns: 100 },
      );
    });

    test("name は必須", () => {
      const noName = { arguments: { key: "value" } };
      const result = CallToolRequestParamsSchema.safeParse(noName);
      expect(result.success).toStrictEqual(false);
    });

    test("name は文字列でなければならない", () => {
      fc.assert(
        fc.property(
          fc.oneof(fc.integer(), fc.boolean(), fc.constant(null)),
          (invalidName) => {
            const result = CallToolRequestParamsSchema.safeParse({
              name: invalidName,
            });
            expect(result.success).toStrictEqual(false);
          },
        ),
        { numRuns: 20 },
      );
    });

    test("arguments はオプショナル", () => {
      fc.assert(
        fc.property(fc.string({ minLength: 1 }), (name) => {
          const result = CallToolRequestParamsSchema.safeParse({ name });
          expect(result.success).toStrictEqual(true);
        }),
        { numRuns: 50 },
      );
    });

    test("arguments はレコード型でなければならない", () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          fc.oneof(fc.string(), fc.integer(), fc.array(fc.string())),
          (name, invalidArgs) => {
            const result = CallToolRequestParamsSchema.safeParse({
              name,
              arguments: invalidArgs,
            });
            expect(result.success).toStrictEqual(false);
          },
        ),
        { numRuns: 20 },
      );
    });

    test("arguments に任意の値を持てる", () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          fc.dictionary(fc.string({ minLength: 1 }), fc.jsonValue()),
          (name, args) => {
            const result = CallToolRequestParamsSchema.safeParse({
              name,
              arguments: args,
            });
            expect(result.success).toStrictEqual(true);
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  describe("スキーマの堅牢性", () => {
    test("追加のプロパティは無視される（SearchToolsArgs）", () => {
      fc.assert(
        fc.property(
          fc.string(),
          fc.string(),
          fc.string(),
          (query, extra1, extra2) => {
            const result = SearchToolsArgsSchema.safeParse({
              query,
              extra1,
              extra2,
            });
            expect(result.success).toStrictEqual(true);
          },
        ),
        { numRuns: 20 },
      );
    });

    test("追加のプロパティは無視される（DescribeToolsArgs）", () => {
      fc.assert(
        fc.property(fc.array(fc.string()), fc.string(), (toolNames, extra) => {
          const result = DescribeToolsArgsSchema.safeParse({
            toolNames,
            extra,
          });
          expect(result.success).toStrictEqual(true);
        }),
        { numRuns: 20 },
      );
    });

    test("追加のプロパティは無視される（CallToolRequestParams）", () => {
      fc.assert(
        fc.property(fc.string({ minLength: 1 }), fc.string(), (name, extra) => {
          const result = CallToolRequestParamsSchema.safeParse({
            name,
            extra,
          });
          expect(result.success).toStrictEqual(true);
        }),
        { numRuns: 20 },
      );
    });
  });
});
