/**
 * JSON-RPC 型ガードの Property-Based Testing
 *
 * テストするプロパティ:
 * - 成功レスポンスとエラーレスポンスは相互排他的
 * - 有効な構造が正しく識別される
 * - 無効な入力はすべて false を返す
 */

import { describe, test, expect } from "vitest";
import * as fc from "fast-check";
import {
  isJsonRpcRequest,
  isJsonRpcNotification,
  isJsonRpcSuccessResponse,
  isJsonRpcErrorResponse,
  isMcpToolCallResult,
} from "../typeGuards.js";
import {
  jsonRpcRequestArbitrary,
  jsonRpcSuccessResponseArbitrary,
  jsonRpcErrorResponseArbitrary,
  mcpToolCallResultArbitrary,
  nonJsonRpcObjectArbitrary,
} from "../../../../test-utils/arbitraries.js";

describe("typeGuards", () => {
  describe("isJsonRpcRequest", () => {
    test("有効なリクエストに対して true を返す", () => {
      fc.assert(
        fc.property(jsonRpcRequestArbitrary, (request) => {
          expect(isJsonRpcRequest(request)).toStrictEqual(true);
        }),
        { numRuns: 100 },
      );
    });

    test("jsonrpc と method を持つオブジェクトを識別する", () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          fc.option(fc.jsonValue(), { nil: undefined }),
          fc.option(fc.oneof(fc.string(), fc.integer(), fc.constant(null)), {
            nil: undefined,
          }),
          (method, params, id) => {
            const request = {
              jsonrpc: "2.0" as const,
              method,
              ...(params !== undefined && { params }),
              ...(id !== undefined && { id }),
            };
            expect(isJsonRpcRequest(request)).toStrictEqual(true);
          },
        ),
        { numRuns: 50 },
      );
    });

    test("非 JSON-RPC オブジェクトに対して false を返す", () => {
      fc.assert(
        fc.property(nonJsonRpcObjectArbitrary, (obj) => {
          expect(isJsonRpcRequest(obj)).toStrictEqual(false);
        }),
        { numRuns: 100 },
      );
    });

    test("method がない場合は false を返す", () => {
      const noMethod = { jsonrpc: "2.0" as const };
      expect(isJsonRpcRequest(noMethod)).toStrictEqual(false);
    });

    test("method が文字列でない場合は false を返す", () => {
      fc.assert(
        fc.property(
          fc.oneof(fc.integer(), fc.boolean(), fc.constant(null)),
          (method) => {
            const invalid = { jsonrpc: "2.0", method };
            expect(isJsonRpcRequest(invalid)).toStrictEqual(false);
          },
        ),
        { numRuns: 20 },
      );
    });
  });

  describe("isJsonRpcNotification", () => {
    test("id がないリクエストに対して true を返す", () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          fc.option(fc.jsonValue(), { nil: undefined }),
          (method, params) => {
            const notification = {
              jsonrpc: "2.0" as const,
              method,
              ...(params !== undefined && { params }),
            };
            expect(isJsonRpcNotification(notification)).toStrictEqual(true);
          },
        ),
        { numRuns: 50 },
      );
    });

    test("id があるリクエストに対して false を返す", () => {
      fc.assert(
        fc.property(
          jsonRpcRequestArbitrary.filter(
            (req) => req.id !== undefined && "id" in req,
          ),
          (request) => {
            // id が明示的にある場合は通知ではない
            expect(isJsonRpcNotification(request)).toStrictEqual(false);
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  describe("isJsonRpcSuccessResponse", () => {
    test("有効な成功レスポンスに対して true を返す", () => {
      fc.assert(
        fc.property(jsonRpcSuccessResponseArbitrary, (response) => {
          expect(isJsonRpcSuccessResponse(response)).toStrictEqual(true);
        }),
        { numRuns: 100 },
      );
    });

    test("result を持つオブジェクトを識別する", () => {
      fc.assert(
        fc.property(
          fc.oneof(fc.string(), fc.integer(), fc.constant(null)),
          fc.jsonValue(),
          (id, result) => {
            const response = {
              jsonrpc: "2.0" as const,
              id,
              result,
            };
            expect(isJsonRpcSuccessResponse(response)).toStrictEqual(true);
          },
        ),
        { numRuns: 50 },
      );
    });

    test("result がないオブジェクトに対して false を返す", () => {
      const noResult = { jsonrpc: "2.0" as const, id: 1 };
      expect(isJsonRpcSuccessResponse(noResult)).toStrictEqual(false);
    });

    test("非 JSON-RPC オブジェクトに対して false を返す", () => {
      fc.assert(
        fc.property(nonJsonRpcObjectArbitrary, (obj) => {
          expect(isJsonRpcSuccessResponse(obj)).toStrictEqual(false);
        }),
        { numRuns: 100 },
      );
    });
  });

  describe("isJsonRpcErrorResponse", () => {
    test("有効なエラーレスポンスに対して true を返す", () => {
      fc.assert(
        fc.property(jsonRpcErrorResponseArbitrary, (response) => {
          expect(isJsonRpcErrorResponse(response)).toStrictEqual(true);
        }),
        { numRuns: 100 },
      );
    });

    test("error を持つオブジェクトを識別する", () => {
      fc.assert(
        fc.property(
          fc.oneof(fc.string(), fc.integer(), fc.constant(null)),
          fc.integer(),
          fc.string(),
          (id, code, message) => {
            const response = {
              jsonrpc: "2.0" as const,
              id,
              error: { code, message },
            };
            expect(isJsonRpcErrorResponse(response)).toStrictEqual(true);
          },
        ),
        { numRuns: 50 },
      );
    });

    test("error がないオブジェクトに対して false を返す", () => {
      const noError = { jsonrpc: "2.0" as const, id: 1 };
      expect(isJsonRpcErrorResponse(noError)).toStrictEqual(false);
    });

    test("非 JSON-RPC オブジェクトに対して false を返す", () => {
      fc.assert(
        fc.property(nonJsonRpcObjectArbitrary, (obj) => {
          expect(isJsonRpcErrorResponse(obj)).toStrictEqual(false);
        }),
        { numRuns: 100 },
      );
    });
  });

  describe("成功レスポンスとエラーレスポンスの相互排他性", () => {
    test("成功レスポンスはエラーレスポンスではない", () => {
      fc.assert(
        fc.property(jsonRpcSuccessResponseArbitrary, (response) => {
          // 同じオブジェクトが両方の型に一致しないことを確認
          // (ただし、result と error 両方持つ場合は除く)
          if (!("error" in response)) {
            expect(isJsonRpcSuccessResponse(response)).toStrictEqual(true);
            expect(isJsonRpcErrorResponse(response)).toStrictEqual(false);
          }
        }),
        { numRuns: 100 },
      );
    });

    test("エラーレスポンスは成功レスポンスではない", () => {
      fc.assert(
        fc.property(jsonRpcErrorResponseArbitrary, (response) => {
          // result がない場合は成功レスポンスではない
          if (!("result" in response)) {
            expect(isJsonRpcErrorResponse(response)).toStrictEqual(true);
            expect(isJsonRpcSuccessResponse(response)).toStrictEqual(false);
          }
        }),
        { numRuns: 100 },
      );
    });
  });

  describe("isMcpToolCallResult", () => {
    test("有効な MCP ツール呼び出し結果に対して true を返す", () => {
      fc.assert(
        fc.property(mcpToolCallResultArbitrary, (result) => {
          expect(isMcpToolCallResult(result)).toStrictEqual(true);
        }),
        { numRuns: 100 },
      );
    });

    test("content 配列を持つオブジェクトを識別する", () => {
      fc.assert(
        fc.property(
          fc.array(fc.jsonValue()),
          fc.option(fc.boolean(), { nil: undefined }),
          (content, isError) => {
            const result = {
              content,
              ...(isError !== undefined && { isError }),
            };
            expect(isMcpToolCallResult(result)).toStrictEqual(true);
          },
        ),
        { numRuns: 50 },
      );
    });

    test("content がないオブジェクトに対して false を返す", () => {
      const noContent = { isError: false };
      expect(isMcpToolCallResult(noContent)).toStrictEqual(false);
    });

    test("content が配列でない場合は false を返す", () => {
      fc.assert(
        fc.property(
          fc.oneof(fc.string(), fc.integer(), fc.record({ key: fc.string() })),
          (content) => {
            const invalid = { content };
            expect(isMcpToolCallResult(invalid)).toStrictEqual(false);
          },
        ),
        { numRuns: 20 },
      );
    });

    test("プリミティブ値に対して false を返す", () => {
      const primitives = [null, undefined, 42, "string", true];
      primitives.forEach((value) => {
        expect(isMcpToolCallResult(value)).toStrictEqual(false);
      });
    });
  });

  describe("境界条件", () => {
    test("空のオブジェクトに対してすべての型ガードが false を返す", () => {
      const empty = {};
      expect(isJsonRpcRequest(empty)).toStrictEqual(false);
      expect(isJsonRpcNotification(empty)).toStrictEqual(false);
      expect(isJsonRpcSuccessResponse(empty)).toStrictEqual(false);
      expect(isJsonRpcErrorResponse(empty)).toStrictEqual(false);
      expect(isMcpToolCallResult(empty)).toStrictEqual(false);
    });

    test("null に対してすべての型ガードが false を返す", () => {
      expect(isJsonRpcRequest(null)).toStrictEqual(false);
      expect(isJsonRpcNotification(null)).toStrictEqual(false);
      expect(isJsonRpcSuccessResponse(null)).toStrictEqual(false);
      expect(isJsonRpcErrorResponse(null)).toStrictEqual(false);
      expect(isMcpToolCallResult(null)).toStrictEqual(false);
    });

    test("undefined に対してすべての型ガードが false を返す", () => {
      expect(isJsonRpcRequest(undefined)).toStrictEqual(false);
      expect(isJsonRpcNotification(undefined)).toStrictEqual(false);
      expect(isJsonRpcSuccessResponse(undefined)).toStrictEqual(false);
      expect(isJsonRpcErrorResponse(undefined)).toStrictEqual(false);
      expect(isMcpToolCallResult(undefined)).toStrictEqual(false);
    });
  });
});
