/**
 * MCPエラー処理とHTTPステータスマッピングのテスト
 */

import { describe, test, expect } from "vitest";
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import {
  extractMcpErrorInfo,
  getErrorCodeName,
  type McpErrorInfo,
} from "../mcpErrorHandler.js";

describe("extractMcpErrorInfo", () => {
  describe("McpErrorの処理", () => {
    test("MethodNotFoundは404を返す", () => {
      const error = new McpError(ErrorCode.MethodNotFound, "Method not found");
      const result = extractMcpErrorInfo(error);

      expect(result.httpStatus).toBe(404);
      expect(result.errorCode).toBe(ErrorCode.MethodNotFound);
      // MCP SDK v1.8+ではメッセージがフォーマットされる
      expect(result.errorMessage).toContain("Method not found");
      expect(result.errorData).toBeUndefined();
    });

    test("InvalidParamsは400を返す", () => {
      const error = new McpError(ErrorCode.InvalidParams, "Invalid parameters");
      const result = extractMcpErrorInfo(error);

      expect(result.httpStatus).toBe(400);
      expect(result.errorCode).toBe(ErrorCode.InvalidParams);
      expect(result.errorMessage).toContain("Invalid parameters");
      expect(result.errorData).toBeUndefined();
    });

    test("InvalidRequestは400を返す", () => {
      const error = new McpError(ErrorCode.InvalidRequest, "Invalid request");
      const result = extractMcpErrorInfo(error);

      expect(result.httpStatus).toBe(400);
      expect(result.errorCode).toBe(ErrorCode.InvalidRequest);
      expect(result.errorMessage).toContain("Invalid request");
      expect(result.errorData).toBeUndefined();
    });

    test("ParseErrorは400を返す", () => {
      const error = new McpError(ErrorCode.ParseError, "Parse error");
      const result = extractMcpErrorInfo(error);

      expect(result.httpStatus).toBe(400);
      expect(result.errorCode).toBe(ErrorCode.ParseError);
      expect(result.errorMessage).toContain("Parse error");
      expect(result.errorData).toBeUndefined();
    });

    test("RequestTimeoutは408を返す", () => {
      const error = new McpError(ErrorCode.RequestTimeout, "Request timeout");
      const result = extractMcpErrorInfo(error);

      expect(result.httpStatus).toBe(408);
      expect(result.errorCode).toBe(ErrorCode.RequestTimeout);
      expect(result.errorMessage).toContain("Request timeout");
      expect(result.errorData).toBeUndefined();
    });

    test("ConnectionClosedは503を返す", () => {
      const error = new McpError(
        ErrorCode.ConnectionClosed,
        "Connection closed",
      );
      const result = extractMcpErrorInfo(error);

      expect(result.httpStatus).toBe(503);
      expect(result.errorCode).toBe(ErrorCode.ConnectionClosed);
      expect(result.errorMessage).toContain("Connection closed");
      expect(result.errorData).toBeUndefined();
    });

    test("InternalErrorは500を返す", () => {
      const error = new McpError(ErrorCode.InternalError, "Internal error");
      const result = extractMcpErrorInfo(error);

      expect(result.httpStatus).toBe(500);
      expect(result.errorCode).toBe(ErrorCode.InternalError);
      expect(result.errorMessage).toContain("Internal error");
      expect(result.errorData).toBeUndefined();
    });

    test("errorDataが正しく保持される", () => {
      const errorData = { field: "testField", reason: "validation failed" };
      const error = new McpError(
        ErrorCode.InvalidParams,
        "Invalid parameters",
        errorData,
      );
      const result = extractMcpErrorInfo(error);

      expect(result.httpStatus).toBe(400);
      expect(result.errorCode).toBe(ErrorCode.InvalidParams);
      expect(result.errorMessage).toContain("Invalid parameters");
      expect(result.errorData).toStrictEqual(errorData);
    });

    test("不明なエラーコードは500を返す", () => {
      // 既知のエラーコード以外（-999など）
      const error = new McpError(-999 as ErrorCode, "Unknown error");
      const result = extractMcpErrorInfo(error);

      expect(result.httpStatus).toBe(500);
      expect(result.errorCode).toBe(-999);
      expect(result.errorMessage).toContain("Unknown error");
      expect(result.errorData).toBeUndefined();
    });
  });

  describe("通常のErrorの処理", () => {
    test("通常のErrorは500とInternalErrorを返す", () => {
      const error = new Error("Something went wrong");
      const result = extractMcpErrorInfo(error);

      expect(result).toStrictEqual<McpErrorInfo>({
        httpStatus: 500,
        errorCode: ErrorCode.InternalError,
        errorMessage: "Something went wrong",
      });
    });

    test("カスタムエラークラスも正しく処理される", () => {
      class CustomError extends Error {
        constructor(message: string) {
          super(message);
          this.name = "CustomError";
        }
      }

      const error = new CustomError("Custom error message");
      const result = extractMcpErrorInfo(error);

      expect(result).toStrictEqual<McpErrorInfo>({
        httpStatus: 500,
        errorCode: ErrorCode.InternalError,
        errorMessage: "Custom error message",
      });
    });
  });

  describe("非Errorオブジェクトの処理", () => {
    test("文字列は'Unknown error'を返す", () => {
      const result = extractMcpErrorInfo("string error");

      expect(result).toStrictEqual<McpErrorInfo>({
        httpStatus: 500,
        errorCode: ErrorCode.InternalError,
        errorMessage: "Unknown error",
      });
    });

    test("数値は'Unknown error'を返す", () => {
      const result = extractMcpErrorInfo(42);

      expect(result).toStrictEqual<McpErrorInfo>({
        httpStatus: 500,
        errorCode: ErrorCode.InternalError,
        errorMessage: "Unknown error",
      });
    });

    test("nullは'Unknown error'を返す", () => {
      const result = extractMcpErrorInfo(null);

      expect(result).toStrictEqual<McpErrorInfo>({
        httpStatus: 500,
        errorCode: ErrorCode.InternalError,
        errorMessage: "Unknown error",
      });
    });

    test("undefinedは'Unknown error'を返す", () => {
      const result = extractMcpErrorInfo(undefined);

      expect(result).toStrictEqual<McpErrorInfo>({
        httpStatus: 500,
        errorCode: ErrorCode.InternalError,
        errorMessage: "Unknown error",
      });
    });

    test("プレーンオブジェクトは'Unknown error'を返す", () => {
      const result = extractMcpErrorInfo({ message: "error object" });

      expect(result).toStrictEqual<McpErrorInfo>({
        httpStatus: 500,
        errorCode: ErrorCode.InternalError,
        errorMessage: "Unknown error",
      });
    });
  });
});

describe("getErrorCodeName", () => {
  describe("既知のエラーコード", () => {
    test("ConnectionClosedを正しく返す", () => {
      expect(getErrorCodeName(ErrorCode.ConnectionClosed)).toBe(
        "ConnectionClosed",
      );
    });

    test("RequestTimeoutを正しく返す", () => {
      expect(getErrorCodeName(ErrorCode.RequestTimeout)).toBe("RequestTimeout");
    });

    test("ParseErrorを正しく返す", () => {
      expect(getErrorCodeName(ErrorCode.ParseError)).toBe("ParseError");
    });

    test("InvalidRequestを正しく返す", () => {
      expect(getErrorCodeName(ErrorCode.InvalidRequest)).toBe("InvalidRequest");
    });

    test("MethodNotFoundを正しく返す", () => {
      expect(getErrorCodeName(ErrorCode.MethodNotFound)).toBe("MethodNotFound");
    });

    test("InvalidParamsを正しく返す", () => {
      expect(getErrorCodeName(ErrorCode.InvalidParams)).toBe("InvalidParams");
    });

    test("InternalErrorを正しく返す", () => {
      expect(getErrorCodeName(ErrorCode.InternalError)).toBe("InternalError");
    });
  });

  describe("不明なエラーコード", () => {
    test("不明なコードは'Unknown(code)'形式で返す", () => {
      expect(getErrorCodeName(-999)).toBe("Unknown(-999)");
      expect(getErrorCodeName(0)).toBe("Unknown(0)");
      expect(getErrorCodeName(12345)).toBe("Unknown(12345)");
    });
  });

  describe("ErrorCodeの数値に対する動作", () => {
    // ErrorCodeの実際の数値を使用してテスト
    test("ErrorCode定数を数値として渡しても正しく動作する", () => {
      // ErrorCodeは列挙型なので数値に変換される
      const errorCodes = [
        { code: ErrorCode.ConnectionClosed, name: "ConnectionClosed" },
        { code: ErrorCode.RequestTimeout, name: "RequestTimeout" },
        { code: ErrorCode.ParseError, name: "ParseError" },
        { code: ErrorCode.InvalidRequest, name: "InvalidRequest" },
        { code: ErrorCode.MethodNotFound, name: "MethodNotFound" },
        { code: ErrorCode.InvalidParams, name: "InvalidParams" },
        { code: ErrorCode.InternalError, name: "InternalError" },
      ];

      for (const { code, name } of errorCodes) {
        expect(getErrorCodeName(code)).toBe(name);
      }
    });
  });
});
