import { describe, test, expect } from "vitest";
import { ReAuthRequiredError } from "@tumiki/oauth-token-manager";
import { isReAuthRequiredError, createReAuthResponse } from "../reAuthError.js";

describe("isReAuthRequiredError", () => {
  test("ReAuthRequiredError インスタンスに対して true を返す", () => {
    const error = new ReAuthRequiredError(
      "Token expired",
      "token-123",
      "user-456",
      "mcp-server-789",
    );

    expect(isReAuthRequiredError(error)).toBe(true);
  });

  test("通常の Error に対して false を返す", () => {
    const error = new Error("Regular error");

    expect(isReAuthRequiredError(error)).toBe(false);
  });

  test("TypeError に対して false を返す", () => {
    const error = new TypeError("Type error");

    expect(isReAuthRequiredError(error)).toBe(false);
  });

  test("null に対して false を返す", () => {
    expect(isReAuthRequiredError(null)).toBe(false);
  });

  test("undefined に対して false を返す", () => {
    expect(isReAuthRequiredError(undefined)).toBe(false);
  });

  test("文字列に対して false を返す", () => {
    expect(isReAuthRequiredError("error message")).toBe(false);
  });

  test("オブジェクトに対して false を返す", () => {
    const fakeError = {
      name: "ReAuthRequiredError",
      message: "Fake error",
      tokenId: "token-123",
    };

    expect(isReAuthRequiredError(fakeError)).toBe(false);
  });
});

describe("createReAuthResponse", () => {
  const baseUrl = "https://mcp.example.com";
  const mcpServerId = "test-server-id";
  const error = new ReAuthRequiredError(
    "Token expired and refresh failed",
    "token-123",
    "user-456",
    "mcp-server-789",
  );

  test("正しい HTTP ステータス 401 を返す", () => {
    const response = createReAuthResponse(error, mcpServerId, null, baseUrl);

    expect(response.httpStatus).toBe(401);
  });

  test("正しい WWW-Authenticate ヘッダーを生成する", () => {
    const response = createReAuthResponse(error, mcpServerId, null, baseUrl);

    expect(response.headers["WWW-Authenticate"]).toBe(
      `Bearer resource_metadata="${baseUrl}/.well-known/oauth-protected-resource/mcp/${mcpServerId}"`,
    );
  });

  test("JSON-RPC 2.0 形式のエラーを生成する", () => {
    const response = createReAuthResponse(error, mcpServerId, null, baseUrl);

    expect(response.jsonRpcError.jsonrpc).toBe("2.0");
    expect(response.jsonRpcError.error.code).toBe(-32600);
    expect(response.jsonRpcError.error.data.type).toBe("ReAuthRequired");
  });

  test("リクエスト ID が null の場合は null を返す", () => {
    const response = createReAuthResponse(error, mcpServerId, null, baseUrl);

    expect(response.jsonRpcError.id).toBeNull();
  });

  test("リクエスト ID が数値の場合はそのまま返す", () => {
    const response = createReAuthResponse(error, mcpServerId, 42, baseUrl);

    expect(response.jsonRpcError.id).toBe(42);
  });

  test("リクエスト ID が文字列の場合はそのまま返す", () => {
    const response = createReAuthResponse(
      error,
      mcpServerId,
      "request-123",
      baseUrl,
    );

    expect(response.jsonRpcError.id).toBe("request-123");
  });

  test("エラーメッセージを含む", () => {
    const response = createReAuthResponse(error, mcpServerId, null, baseUrl);

    expect(response.jsonRpcError.error.message).toContain(
      "Token expired and refresh failed",
    );
  });

  test("resource_metadata URL が正しい形式で生成される", () => {
    const response = createReAuthResponse(error, mcpServerId, null, baseUrl);

    expect(response.jsonRpcError.error.data.resource_metadata).toBe(
      `${baseUrl}/.well-known/oauth-protected-resource/mcp/${mcpServerId}`,
    );
  });

  test("異なる baseUrl でも正しく動作する", () => {
    const customBaseUrl = "http://localhost:8080";
    const response = createReAuthResponse(
      error,
      mcpServerId,
      null,
      customBaseUrl,
    );

    expect(response.headers["WWW-Authenticate"]).toBe(
      `Bearer resource_metadata="${customBaseUrl}/.well-known/oauth-protected-resource/mcp/${mcpServerId}"`,
    );
    expect(response.jsonRpcError.error.data.resource_metadata).toBe(
      `${customBaseUrl}/.well-known/oauth-protected-resource/mcp/${mcpServerId}`,
    );
  });

  test("異なる mcpServerId でも正しく動作する", () => {
    const customServerId = "custom-mcp-server-xyz";
    const response = createReAuthResponse(error, customServerId, null, baseUrl);

    expect(response.headers["WWW-Authenticate"]).toContain(customServerId);
    expect(response.jsonRpcError.error.data.resource_metadata).toContain(
      customServerId,
    );
  });
});
