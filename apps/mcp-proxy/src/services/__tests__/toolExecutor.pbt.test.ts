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
import { parseToolName } from "../toolExecutor.js";
import {
  validFullToolNameArbitrary,
  validInstanceNameArbitrary,
  validToolNameArbitrary,
} from "../../test-utils/arbitraries.js";

describe("parseToolName", () => {
  describe("有効なツール名のパース", () => {
    test("有効な形式（instance__tool）が常に正しくパースされる", () => {
      fc.assert(
        fc.property(
          validInstanceNameArbitrary,
          validToolNameArbitrary,
          (instanceName, toolName) => {
            const fullToolName = `${instanceName}__${toolName}`;
            const result = parseToolName(fullToolName);

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
          const { instanceName, toolName } = parseToolName(fullToolName);
          const reconstructed = `${instanceName}__${toolName}`;

          expect(reconstructed).toStrictEqual(fullToolName);
        }),
        { numRuns: 100 },
      );
    });

    test("インスタンス名とツール名は空でない文字列", () => {
      fc.assert(
        fc.property(validFullToolNameArbitrary, (fullToolName) => {
          const { instanceName, toolName } = parseToolName(fullToolName);

          expect(instanceName.length).toBeGreaterThan(0);
          expect(toolName.length).toBeGreaterThan(0);
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
        const result = parseToolName(full);
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
            expect(() => parseToolName(invalidName)).toThrow(
              /Invalid tool name format/,
            );
          },
        ),
        { numRuns: 100 },
      );
    });

    test("複数の区切り文字を含む文字列はエラーをスロー", () => {
      fc.assert(
        fc.property(
          validInstanceNameArbitrary,
          validToolNameArbitrary,
          validToolNameArbitrary,
          (part1, part2, part3) => {
            const invalidName = `${part1}__${part2}__${part3}`;
            expect(() => parseToolName(invalidName)).toThrow(
              /Invalid tool name format/,
            );
          },
        ),
        { numRuns: 50 },
      );
    });

    test("空の部分を持つ文字列でもパース自体は成功する（バリデーションは呼び出し側で行う）", () => {
      // 注意: 現在の実装は split("__") でパースするため、
      // 空の部分を持つ文字列でもパース自体は成功する
      // バリデーションは上位層（API等）で行う設計
      const emptyPartNames = [
        { full: "__tool", instance: "", tool: "tool" },
        { full: "instance__", instance: "instance", tool: "" },
        { full: "__", instance: "", tool: "" }, // 両方空でもパース成功
      ];

      emptyPartNames.forEach(({ full, instance, tool }) => {
        const result = parseToolName(full);
        expect(result.instanceName).toStrictEqual(instance);
        expect(result.toolName).toStrictEqual(tool);
      });
    });

    test("エラーメッセージに無効なツール名が含まれる", () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }).filter((s) => !s.includes("__")),
          (invalidName) => {
            try {
              parseToolName(invalidName);
              // ここに到達すべきではない
              expect.fail("Expected an error to be thrown");
            } catch (error) {
              expect(error).toBeInstanceOf(Error);
              expect((error as Error).message).toContain(invalidName);
            }
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  describe("境界条件", () => {
    test("最小有効なツール名（a__b）をパースできる", () => {
      const result = parseToolName("a__b");
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
            const result = parseToolName(fullToolName);

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
        const result = parseToolName(full);
        expect(result.instanceName).toStrictEqual(instance);
        expect(result.toolName).toStrictEqual(tool);
      });
    });
  });
});
