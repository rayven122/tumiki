/**
 * ツール名パース関数の Property-Based Testing
 *
 * テストするプロパティ:
 * - 有効な形式（instance__tool）が常に正しくパースされる
 * - 無効な形式はエラーをスロー
 * - パース結果から元のツール名を再構成可能
 */

import { describe, test, expect } from "vitest";
import * as fc from "fast-check";
import { parseNamespacedToolName } from "../../../../../domain/values/namespacedToolName.js";
import { DomainError } from "../../../../../domain/errors/domainError.js";
import {
  validFullToolNameArbitrary,
  validInstanceNameArbitrary,
  validToolNameArbitrary,
} from "../../../../../test-utils/arbitraries.js";

describe("parseNamespacedToolName", () => {
  describe("有効なツール名のパース", () => {
    test("有効な形式（instance__tool）が常に正しくパースされる", () => {
      fc.assert(
        fc.property(
          validInstanceNameArbitrary,
          validToolNameArbitrary,
          (instanceName, toolName) => {
            const fullToolName = `${instanceName}__${toolName}`;
            const result = parseNamespacedToolName(fullToolName);

            expect(result.instanceName).toStrictEqual(instanceName);
            expect(result.toolName).toStrictEqual(toolName);
          },
        ),
        { numRuns: 100 },
      );
    });

    test("パース結果から元のツール名を再構成できる", () => {
      fc.assert(
        fc.property(validFullToolNameArbitrary, (fullToolName) => {
          const { instanceName, toolName } =
            parseNamespacedToolName(fullToolName);
          const reconstructed = `${instanceName}__${toolName}`;

          expect(reconstructed).toStrictEqual(fullToolName);
        }),
        { numRuns: 100 },
      );
    });

    test("インスタンス名とツール名は空でない文字列", () => {
      fc.assert(
        fc.property(validFullToolNameArbitrary, (fullToolName) => {
          const { instanceName, toolName } =
            parseNamespacedToolName(fullToolName);

          expect(instanceName.length).toBeGreaterThan(0);
          expect(toolName.length).toBeGreaterThan(0);
        }),
        { numRuns: 100 },
      );
    });

    test("fullName プロパティが元の入力と一致する", () => {
      fc.assert(
        fc.property(validFullToolNameArbitrary, (fullToolName) => {
          const result = parseNamespacedToolName(fullToolName);

          expect(result.fullName).toStrictEqual(fullToolName);
        }),
        { numRuns: 100 },
      );
    });

    test("複雑なツール名でも正しくパースできる", () => {
      const complexNames = [
        { full: "instance__tool", instance: "instance", tool: "tool" },
        { full: "my-server__my-tool", instance: "my-server", tool: "my-tool" },
        { full: "server_v1__tool_v2", instance: "server_v1", tool: "tool_v2" },
        { full: "a__b", instance: "a", tool: "b" },
        { full: "UPPER__CASE", instance: "UPPER", tool: "CASE" },
      ];

      complexNames.forEach(({ full, instance, tool }) => {
        const result = parseNamespacedToolName(full);
        expect(result.instanceName).toStrictEqual(instance);
        expect(result.toolName).toStrictEqual(tool);
      });
    });
  });

  describe("無効なツール名のパース", () => {
    test("区切り文字がない文字列はエラーをスロー", () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }).filter((s) => !s.includes("__")),
          (invalidName) => {
            expect(() => parseNamespacedToolName(invalidName)).toThrow(
              DomainError,
            );
          },
        ),
        { numRuns: 100 },
      );
    });

    test("先頭に区切り文字がある文字列（空のインスタンス名）はエラーをスロー", () => {
      fc.assert(
        fc.property(validToolNameArbitrary, (toolName) => {
          const invalidName = `__${toolName}`;
          expect(() => parseNamespacedToolName(invalidName)).toThrow(
            DomainError,
          );
        }),
        { numRuns: 50 },
      );
    });

    test("末尾に区切り文字がある文字列（空のツール名）はエラーをスロー", () => {
      fc.assert(
        fc.property(validInstanceNameArbitrary, (instanceName) => {
          const invalidName = `${instanceName}__`;
          expect(() => parseNamespacedToolName(invalidName)).toThrow(
            DomainError,
          );
        }),
        { numRuns: 50 },
      );
    });

    test("区切り文字のみの文字列はエラーをスロー", () => {
      expect(() => parseNamespacedToolName("__")).toThrow(DomainError);
    });

    test("エラーメッセージに無効なツール名が含まれる", () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }).filter((s) => !s.includes("__")),
          (invalidName) => {
            try {
              parseNamespacedToolName(invalidName);
              // ここに到達すべきではない
              expect.fail("Expected an error to be thrown");
            } catch (error) {
              expect(error).toBeInstanceOf(DomainError);
              expect((error as DomainError).message).toContain(invalidName);
            }
          },
        ),
        { numRuns: 50 },
      );
    });

    test("エラーコードが INVALID_TOOL_NAME である", () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }).filter((s) => !s.includes("__")),
          (invalidName) => {
            try {
              parseNamespacedToolName(invalidName);
              expect.fail("Expected an error to be thrown");
            } catch (error) {
              expect(error).toBeInstanceOf(DomainError);
              expect((error as DomainError).code).toBe("INVALID_TOOL_NAME");
            }
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  describe("境界条件", () => {
    test("最小有効なツール名（a__b）をパースできる", () => {
      const result = parseNamespacedToolName("a__b");
      expect(result.instanceName).toStrictEqual("a");
      expect(result.toolName).toStrictEqual("b");
    });

    test("長いインスタンス名とツール名をパースできる", () => {
      fc.assert(
        fc.property(
          fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9]{99}$/),
          fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9]{99}$/),
          (instanceName, toolName) => {
            const fullToolName = `${instanceName}__${toolName}`;
            const result = parseNamespacedToolName(fullToolName);

            expect(result.instanceName).toStrictEqual(instanceName);
            expect(result.toolName).toStrictEqual(toolName);
          },
        ),
        { numRuns: 10 },
      );
    });

    test("特殊文字（ハイフン、アンダースコア）を含むツール名をパースできる", () => {
      const names = [
        {
          full: "my-instance__my-tool",
          instance: "my-instance",
          tool: "my-tool",
        },
        {
          full: "my_instance__my_tool",
          instance: "my_instance",
          tool: "my_tool",
        },
        {
          full: "a-b-c__x-y-z",
          instance: "a-b-c",
          tool: "x-y-z",
        },
      ];

      names.forEach(({ full, instance, tool }) => {
        const result = parseNamespacedToolName(full);
        expect(result.instanceName).toStrictEqual(instance);
        expect(result.toolName).toStrictEqual(tool);
      });
    });

    test("複数の区切り文字を含む場合、最初の区切り文字で分割される", () => {
      // 新しい実装では indexOf("__") を使用するため、最初の "__" で分割
      const result = parseNamespacedToolName("part1__part2__part3");
      expect(result.instanceName).toStrictEqual("part1");
      expect(result.toolName).toStrictEqual("part2__part3");
    });
  });
});
