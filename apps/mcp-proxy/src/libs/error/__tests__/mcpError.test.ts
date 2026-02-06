/**
 * MCPエラー生成ユーティリティのユニットテスト
 */

import { describe, test, expect } from "vitest";
import { ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import {
  createMcpError,
  createUnauthorizedError,
  createPermissionDeniedError,
  createInvalidRequestError,
  createNotFoundError,
} from "../mcpError.js";

describe("mcpError", () => {
  describe("createMcpError", () => {
    test("JSON-RPC 2.0形式のエラーレスポンスを生成する", () => {
      const error = createMcpError(-32600, "Test error");

      expect(error.jsonrpc).toStrictEqual("2.0");
      expect(error.id).toStrictEqual(null);
      expect(error.error.code).toStrictEqual(-32600);
      expect(error.error.message).toStrictEqual("Test error");
    });

    test("カスタムリクエストIDを設定できる", () => {
      const errorWithStringId = createMcpError(
        -32600,
        "Test",
        undefined,
        "req-123",
      );
      expect(errorWithStringId.id).toStrictEqual("req-123");

      const errorWithNumberId = createMcpError(-32600, "Test", undefined, 42);
      expect(errorWithNumberId.id).toStrictEqual(42);

      const errorWithNullId = createMcpError(-32600, "Test", undefined, null);
      expect(errorWithNullId.id).toStrictEqual(null);
    });

    test("追加データを含めることができる", () => {
      const error = createMcpError(-32600, "Test", { detail: "extra info" });

      expect(error.error.data).toStrictEqual({ detail: "extra info" });
    });

    test("dataがundefinedの場合はdata プロパティを含まない", () => {
      const error = createMcpError(-32600, "Test");

      expect("data" in error.error).toStrictEqual(false);
    });

    test("ErrorCodeの各コードを使用できる", () => {
      const parseError = createMcpError(ErrorCode.ParseError, "Parse error");
      expect(parseError.error.code).toStrictEqual(-32700);

      const invalidRequest = createMcpError(
        ErrorCode.InvalidRequest,
        "Invalid request",
      );
      expect(invalidRequest.error.code).toStrictEqual(-32600);

      const methodNotFound = createMcpError(
        ErrorCode.MethodNotFound,
        "Method not found",
      );
      expect(methodNotFound.error.code).toStrictEqual(-32601);

      const invalidParams = createMcpError(
        ErrorCode.InvalidParams,
        "Invalid params",
      );
      expect(invalidParams.error.code).toStrictEqual(-32602);

      const internalError = createMcpError(
        ErrorCode.InternalError,
        "Internal error",
      );
      expect(internalError.error.code).toStrictEqual(-32603);
    });
  });

  describe("createUnauthorizedError", () => {
    test("デフォルトメッセージでエラーを生成する", () => {
      const error = createUnauthorizedError();

      expect(error.jsonrpc).toStrictEqual("2.0");
      expect(error.error.code).toStrictEqual(ErrorCode.InvalidRequest);
      expect(error.error.message).toStrictEqual("Authentication required");
    });

    test("カスタムメッセージを設定できる", () => {
      const error = createUnauthorizedError("Token expired");

      expect(error.error.message).toStrictEqual("Token expired");
    });

    test("追加データを含めることができる", () => {
      const error = createUnauthorizedError("Auth failed", {
        reason: "invalid_token",
      });

      expect(error.error.data).toStrictEqual({ reason: "invalid_token" });
    });
  });

  describe("createPermissionDeniedError", () => {
    test("デフォルトメッセージでエラーを生成する", () => {
      const error = createPermissionDeniedError();

      expect(error.jsonrpc).toStrictEqual("2.0");
      expect(error.error.code).toStrictEqual(ErrorCode.InvalidRequest);
      expect(error.error.message).toStrictEqual("Permission denied");
    });

    test("カスタムメッセージを設定できる", () => {
      const error = createPermissionDeniedError("Insufficient privileges");

      expect(error.error.message).toStrictEqual("Insufficient privileges");
    });

    test("追加データを含めることができる", () => {
      const error = createPermissionDeniedError("Access denied", {
        requiredRole: "admin",
      });

      expect(error.error.data).toStrictEqual({ requiredRole: "admin" });
    });
  });

  describe("createInvalidRequestError", () => {
    test("デフォルトメッセージでエラーを生成する", () => {
      const error = createInvalidRequestError();

      expect(error.jsonrpc).toStrictEqual("2.0");
      expect(error.error.code).toStrictEqual(ErrorCode.InvalidRequest);
      expect(error.error.message).toStrictEqual("Invalid request");
    });

    test("カスタムメッセージを設定できる", () => {
      const error = createInvalidRequestError("Missing required field");

      expect(error.error.message).toStrictEqual("Missing required field");
    });

    test("追加データを含めることができる", () => {
      const error = createInvalidRequestError("Validation failed", {
        field: "name",
        reason: "required",
      });

      expect(error.error.data).toStrictEqual({
        field: "name",
        reason: "required",
      });
    });
  });

  describe("createNotFoundError", () => {
    test("デフォルトメッセージでエラーを生成する", () => {
      const error = createNotFoundError();

      expect(error.jsonrpc).toStrictEqual("2.0");
      expect(error.error.code).toStrictEqual(ErrorCode.InvalidRequest);
      expect(error.error.message).toStrictEqual("Resource not found");
    });

    test("カスタムメッセージを設定できる", () => {
      const error = createNotFoundError("User not found");

      expect(error.error.message).toStrictEqual("User not found");
    });

    test("追加データを含めることができる", () => {
      const error = createNotFoundError("Tool not found", {
        toolName: "unknown_tool",
      });

      expect(error.error.data).toStrictEqual({ toolName: "unknown_tool" });
    });
  });

  describe("エラーレスポンスの一貫性", () => {
    test("すべてのエラー関数がJSON-RPC 2.0形式を返す", () => {
      const errors = [
        createMcpError(-32600, "Test"),
        createUnauthorizedError(),
        createPermissionDeniedError(),
        createInvalidRequestError(),
        createNotFoundError(),
      ];

      errors.forEach((error) => {
        expect(error.jsonrpc).toStrictEqual("2.0");
        expect(error).toHaveProperty("id");
        expect(error).toHaveProperty("error");
        expect(error.error).toHaveProperty("code");
        expect(error.error).toHaveProperty("message");
      });
    });

    test("エラーコードが数値である", () => {
      const errors = [
        createMcpError(-32600, "Test"),
        createUnauthorizedError(),
        createPermissionDeniedError(),
        createInvalidRequestError(),
        createNotFoundError(),
      ];

      errors.forEach((error) => {
        expect(typeof error.error.code).toStrictEqual("number");
      });
    });

    test("エラーメッセージが文字列である", () => {
      const errors = [
        createMcpError(-32600, "Test"),
        createUnauthorizedError(),
        createPermissionDeniedError(),
        createInvalidRequestError(),
        createNotFoundError(),
      ];

      errors.forEach((error) => {
        expect(typeof error.error.message).toStrictEqual("string");
      });
    });
  });
});
