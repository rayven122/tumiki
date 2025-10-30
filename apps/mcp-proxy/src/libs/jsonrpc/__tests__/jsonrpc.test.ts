import { describe, test, expect } from "vitest";
import { createJsonRpcSuccess, createJsonRpcError } from "../index.js";

describe("createJsonRpcSuccess", () => {
  test("正常なID付き成功レスポンスを作成", () => {
    const result = createJsonRpcSuccess(1, { data: "test" });

    expect(result).toStrictEqual({
      jsonrpc: "2.0",
      id: 1,
      result: { data: "test" },
    });
  });

  test("文字列IDでの成功レスポンスを作成", () => {
    const result = createJsonRpcSuccess("abc-123", { value: 42 });

    expect(result).toStrictEqual({
      jsonrpc: "2.0",
      id: "abc-123",
      result: { value: 42 },
    });
  });

  test("null IDの場合はnullとして扱う", () => {
    const result = createJsonRpcSuccess(null, { status: "ok" });

    expect(result).toStrictEqual({
      jsonrpc: "2.0",
      id: null,
      result: { status: "ok" },
    });
  });

  test("undefined IDの場合はnullとして扱う", () => {
    const result = createJsonRpcSuccess(undefined, { message: "success" });

    expect(result).toStrictEqual({
      jsonrpc: "2.0",
      id: null,
      result: { message: "success" },
    });
  });

  test("空のオブジェクトをresultとして返す", () => {
    const result = createJsonRpcSuccess(1, {});

    expect(result).toStrictEqual({
      jsonrpc: "2.0",
      id: 1,
      result: {},
    });
  });

  test("配列をresultとして返す", () => {
    const result = createJsonRpcSuccess(2, [1, 2, 3]);

    expect(result).toStrictEqual({
      jsonrpc: "2.0",
      id: 2,
      result: [1, 2, 3],
    });
  });

  test("nullをresultとして返す", () => {
    const result = createJsonRpcSuccess(3, null);

    expect(result).toStrictEqual({
      jsonrpc: "2.0",
      id: 3,
      result: null,
    });
  });
});

describe("createJsonRpcError", () => {
  test("基本的なエラーレスポンスを作成", () => {
    const error = createJsonRpcError(1, -32600, "Invalid Request");

    expect(error).toStrictEqual({
      jsonrpc: "2.0",
      id: 1,
      error: {
        code: -32600,
        message: "Invalid Request",
      },
    });
  });

  test("追加データ付きのエラーレスポンスを作成", () => {
    const error = createJsonRpcError(2, -32603, "Internal error", {
      details: "Connection failed",
    });

    expect(error).toStrictEqual({
      jsonrpc: "2.0",
      id: 2,
      error: {
        code: -32603,
        message: "Internal error",
        data: {
          details: "Connection failed",
        },
      },
    });
  });

  test("null IDのエラーレスポンスを作成", () => {
    const error = createJsonRpcError(null, -32700, "Parse error");

    expect(error).toStrictEqual({
      jsonrpc: "2.0",
      id: null,
      error: {
        code: -32700,
        message: "Parse error",
      },
    });
  });

  test("undefined IDの場合はnullとして扱う", () => {
    const error = createJsonRpcError(undefined, -32601, "Method not found");

    expect(error).toStrictEqual({
      jsonrpc: "2.0",
      id: null,
      error: {
        code: -32601,
        message: "Method not found",
      },
    });
  });

  test("文字列IDのエラーレスポンスを作成", () => {
    const error = createJsonRpcError("test-id", -32602, "Invalid params");

    expect(error).toStrictEqual({
      jsonrpc: "2.0",
      id: "test-id",
      error: {
        code: -32602,
        message: "Invalid params",
      },
    });
  });

  test("複雑な追加データを含むエラーレスポンスを作成", () => {
    const error = createJsonRpcError(3, -32603, "Server error", {
      code: "ERR_CONNECTION",
      details: {
        host: "example.com",
        port: 8080,
      },
    });

    expect(error).toStrictEqual({
      jsonrpc: "2.0",
      id: 3,
      error: {
        code: -32603,
        message: "Server error",
        data: {
          code: "ERR_CONNECTION",
          details: {
            host: "example.com",
            port: 8080,
          },
        },
      },
    });
  });

  test("undefinedのdataは含まれない", () => {
    const error = createJsonRpcError(4, -32600, "Invalid Request", undefined);

    expect(error).toStrictEqual({
      jsonrpc: "2.0",
      id: 4,
      error: {
        code: -32600,
        message: "Invalid Request",
      },
    });
    expect(error.error).not.toHaveProperty("data");
  });

  test("null値のdataは含まれる", () => {
    const error = createJsonRpcError(5, -32600, "Invalid Request", null);

    expect(error).toStrictEqual({
      jsonrpc: "2.0",
      id: 5,
      error: {
        code: -32600,
        message: "Invalid Request",
        data: null,
      },
    });
  });
});
