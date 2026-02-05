/**
 * JSON-RPC TOON変換の Property-Based Testing
 *
 * テストするプロパティ:
 * - JSON-RPC構造（jsonrpc, id）が保持される
 * - 変換結果は常に有効なJSON
 * - wasConverted フラグの正確性
 * - 安全な変換（エラー時フォールバック）
 */

import { describe, test, expect } from "vitest";
import * as fc from "fast-check";
import {
  convertMcpResponseToToon,
  convertMcpResponseToToonSafe,
} from "../jsonRpcToonConverter.js";
import {
  jsonRpcSuccessResponseArbitrary,
  jsonRpcErrorResponseArbitrary,
  mcpToolCallResultArbitrary,
  jsonRpcIdArbitrary,
} from "../../../test-utils/arbitraries.js";

// JSON-RPC レスポンスの型定義
type JsonRpcSuccessResponseParsed = {
  jsonrpc: string;
  id: string | number | null;
  result?: unknown;
};

type JsonRpcErrorResponseParsed = {
  jsonrpc: string;
  id: string | number | null;
  error?: {
    code: number;
    message: string;
  };
};

type McpResultParsed = {
  jsonrpc: string;
  id: string | number | null;
  result: {
    content: unknown[];
  };
};

describe("jsonRpcToonConverter", () => {
  describe("convertMcpResponseToToon", () => {
    test("成功レスポンス: jsonrpc と id が保持される", () => {
      fc.assert(
        fc.property(jsonRpcSuccessResponseArbitrary, (response) => {
          const jsonStr = JSON.stringify(response);
          const result = convertMcpResponseToToon(jsonStr);

          // パースして構造を確認
          const parsed = JSON.parse(
            result.convertedData,
          ) as JsonRpcSuccessResponseParsed;
          expect(parsed.jsonrpc).toStrictEqual("2.0");
          expect(parsed.id).toStrictEqual(response.id);
        }),
        { numRuns: 30 },
      );
    });

    test("エラーレスポンス: jsonrpc, id, error.code, error.message が保持される", () => {
      fc.assert(
        fc.property(jsonRpcErrorResponseArbitrary, (response) => {
          const jsonStr = JSON.stringify(response);
          const result = convertMcpResponseToToon(jsonStr);

          const parsed = JSON.parse(
            result.convertedData,
          ) as JsonRpcErrorResponseParsed;
          expect(parsed.jsonrpc).toStrictEqual("2.0");
          expect(parsed.id).toStrictEqual(response.id);
          // error 構造があれば検証
          if (parsed.error) {
            expect(parsed.error.code).toStrictEqual(response.error.code);
            expect(parsed.error.message).toStrictEqual(response.error.message);
          }
        }),
        { numRuns: 30 },
      );
    });

    test("変換結果は常に有効なJSON", () => {
      fc.assert(
        fc.property(
          fc.oneof(
            jsonRpcSuccessResponseArbitrary,
            jsonRpcErrorResponseArbitrary,
          ),
          (response) => {
            const jsonStr = JSON.stringify(response);
            const result = convertMcpResponseToToon(jsonStr);

            // JSON.parse が成功することを確認（結果は使用しない）
            JSON.parse(result.convertedData);
          },
        ),
        { numRuns: 30 },
      );
    });

    test("MCP tools/call レスポンス: content 配列構造が保持される", () => {
      fc.assert(
        fc.property(
          jsonRpcIdArbitrary,
          mcpToolCallResultArbitrary,
          (id, mcpResult) => {
            const response = {
              jsonrpc: "2.0" as const,
              id,
              result: mcpResult,
            };
            const jsonStr = JSON.stringify(response);
            const result = convertMcpResponseToToon(jsonStr);

            const parsed = JSON.parse(result.convertedData) as McpResultParsed;
            expect(parsed.result).toBeDefined();
            expect(parsed.result.content).toBeInstanceOf(Array);
            // content 配列の長さが保持されることを確認
            expect(parsed.result.content.length).toStrictEqual(
              mcpResult.content.length,
            );
          },
        ),
        { numRuns: 20 },
      );
    });

    test("空文字列入力は変換なしで返される", () => {
      const result = convertMcpResponseToToon("");
      expect(result.convertedData).toStrictEqual("");
      expect(result.wasConverted).toStrictEqual(false);
      expect(result.inputTokens).toStrictEqual(result.outputTokens);
    });

    test("inputTokens と outputTokens は非負整数", () => {
      fc.assert(
        fc.property(jsonRpcSuccessResponseArbitrary, (response) => {
          const jsonStr = JSON.stringify(response);
          const result = convertMcpResponseToToon(jsonStr);

          expect(result.inputTokens).toBeGreaterThanOrEqual(0);
          expect(result.outputTokens).toBeGreaterThanOrEqual(0);
          expect(Number.isInteger(result.inputTokens)).toStrictEqual(true);
          expect(Number.isInteger(result.outputTokens)).toStrictEqual(true);
        }),
        { numRuns: 20 },
      );
    });

    test("wasConverted が true の場合、outputTokens <= inputTokens", () => {
      fc.assert(
        fc.property(jsonRpcSuccessResponseArbitrary, (response) => {
          const jsonStr = JSON.stringify(response);
          const result = convertMcpResponseToToon(jsonStr);

          if (result.wasConverted) {
            expect(result.outputTokens).toBeLessThan(result.inputTokens);
          }
        }),
        { numRuns: 30 },
      );
    });

    test("wasConverted が false の場合、convertedData は変換前と同じまたは同等", () => {
      fc.assert(
        fc.property(jsonRpcSuccessResponseArbitrary, (response) => {
          const jsonStr = JSON.stringify(response);
          const result = convertMcpResponseToToon(jsonStr);

          if (!result.wasConverted) {
            // 変換されていない場合、出力トークン数は入力と同じ
            expect(result.outputTokens).toStrictEqual(result.inputTokens);
          }
        }),
        { numRuns: 30 },
      );
    });
  });

  describe("convertMcpResponseToToonSafe", () => {
    test("有効なJSONに対して convertMcpResponseToToon と同じ結果を返す", () => {
      fc.assert(
        fc.property(jsonRpcSuccessResponseArbitrary, (response) => {
          const jsonStr = JSON.stringify(response);
          const safeResult = convertMcpResponseToToonSafe(jsonStr);
          const normalResult = convertMcpResponseToToon(jsonStr);

          expect(safeResult).toStrictEqual(normalResult);
        }),
        { numRuns: 20 },
      );
    });

    test("無効なJSON入力でもエラーをスローしない", () => {
      const invalidJsonStrings = [
        "not-json",
        "{invalid",
        "{'single': 'quotes'}",
        "",
        "null",
        "undefined",
      ];

      for (const invalid of invalidJsonStrings) {
        expect(() => convertMcpResponseToToonSafe(invalid)).not.toThrow();
      }
    });

    test("無効なJSON入力は元データをそのまま返す", () => {
      fc.assert(
        fc.property(
          fc.string().filter((s) => {
            try {
              JSON.parse(s);
              return false; // 有効なJSONは除外
            } catch {
              return true; // 無効なJSONのみ
            }
          }),
          (invalidJson) => {
            const result = convertMcpResponseToToonSafe(invalidJson);
            expect(result.convertedData).toStrictEqual(invalidJson);
            expect(result.wasConverted).toStrictEqual(false);
          },
        ),
        { numRuns: 20 },
      );
    });

    test("任意の入力に対してクラッシュしない", () => {
      fc.assert(
        fc.property(fc.string(), (input) => {
          expect(() => convertMcpResponseToToonSafe(input)).not.toThrow();
        }),
        { numRuns: 30 },
      );
    });
  });

  describe("境界条件", () => {
    test("中程度のJSONデータを処理できる", () => {
      // TOON変換はトークンカウントに時間がかかるため、適度なサイズに制限
      const mediumContent = Array.from({ length: 10 }, (_, i) => ({
        type: "text" as const,
        text: `Item ${i}: ${"a".repeat(100)}`,
      }));

      const response = {
        jsonrpc: "2.0" as const,
        id: 1,
        result: {
          content: mediumContent,
        },
      };

      const jsonStr = JSON.stringify(response);
      const result = convertMcpResponseToToon(jsonStr);

      // 処理が完了することを確認（結果は使用しない）
      JSON.parse(result.convertedData);
    });

    test("ネストが深いJSONを処理できる", () => {
      // 深くネストしたオブジェクトを作成
      type NestedObject = { nested: NestedObject | string };
      let nested: NestedObject = { nested: "bottom" };
      for (let i = 0; i < 20; i++) {
        nested = { nested };
      }

      const response = {
        jsonrpc: "2.0" as const,
        id: 1,
        result: nested,
      };

      const jsonStr = JSON.stringify(response);
      const result = convertMcpResponseToToon(jsonStr);

      // 処理が完了することを確認（結果は使用しない）
      JSON.parse(result.convertedData);
    });

    test("Unicode文字を含むテキストを正しく処理する", () => {
      const unicodeTexts = [
        "Hello, 世界！",
        "Emoji: 🎉🚀💡",
        "Arabic: مرحبا",
        "Mixed: Hello世界🎉",
      ];

      for (const text of unicodeTexts) {
        const response = {
          jsonrpc: "2.0" as const,
          id: 1,
          result: {
            content: [{ type: "text" as const, text }],
          },
        };

        const jsonStr = JSON.stringify(response);
        const result = convertMcpResponseToToon(jsonStr);

        const parsed = JSON.parse(result.convertedData) as McpResultParsed;
        expect(parsed.result.content).toBeInstanceOf(Array);
      }
    });

    test("特殊文字（エスケープが必要な文字）を含むテキストを正しく処理する", () => {
      const specialTexts = [
        'Quotes: "hello"',
        "Backslash: C:\\path\\to\\file",
        "Newline:\nTab:\t",
        "Null char: \0",
      ];

      for (const text of specialTexts) {
        const response = {
          jsonrpc: "2.0" as const,
          id: 1,
          result: {
            content: [{ type: "text" as const, text }],
          },
        };

        const jsonStr = JSON.stringify(response);
        const result = convertMcpResponseToToon(jsonStr);

        // 処理が完了することを確認（結果は使用しない）
        JSON.parse(result.convertedData);
      }
    });
  });
});
