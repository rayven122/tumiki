import { describe, test, expect } from "vitest";
import { detectErrorFromOutput, extractAuthError } from "../mcpToolError";

describe("detectErrorFromOutput", () => {
  test("isError: true のオブジェクトを検出する", () => {
    const result = detectErrorFromOutput({ isError: true, message: "error" });
    expect(result).toBe(true);
  });

  test("isError: false のオブジェクトはエラーとして検出しない", () => {
    const result = detectErrorFromOutput({ isError: false, message: "ok" });
    expect(result).toBe(false);
  });

  test("エラーキーワードを含む文字列を検出する", () => {
    const errorMessages = [
      "Failed to execute tool",
      "Failed to connect to server",
      "MCP error occurred",
      "OAuth token not found",
      "User needs to authenticate",
      "Unauthorized access",
      "Request timed out",
      "Connection timeout",
    ];

    for (const message of errorMessages) {
      expect(detectErrorFromOutput(message)).toBe(true);
    }
  });

  test("エラーキーワードを含まない文字列はエラーとして検出しない", () => {
    const result = detectErrorFromOutput("Operation completed successfully");
    expect(result).toBe(false);
  });

  test("null または undefined はエラーとして検出しない", () => {
    expect(detectErrorFromOutput(null)).toBe(false);
    expect(detectErrorFromOutput(undefined)).toBe(false);
  });

  test("数値はエラーとして検出しない", () => {
    expect(detectErrorFromOutput(42)).toBe(false);
  });
});

describe("extractAuthError", () => {
  test("認証エラー情報を正しく抽出する", () => {
    const output = {
      isError: true,
      requiresReauth: true,
      mcpServerId: "server-123",
    };
    const result = extractAuthError(output);
    expect(result).toStrictEqual({
      requiresReauth: true,
      mcpServerId: "server-123",
    });
  });

  test("isError が false の場合は null を返す", () => {
    const output = {
      isError: false,
      requiresReauth: true,
      mcpServerId: "server-123",
    };
    const result = extractAuthError(output);
    expect(result).toBeNull();
  });

  test("requiresReauth が false の場合は null を返す", () => {
    const output = {
      isError: true,
      requiresReauth: false,
      mcpServerId: "server-123",
    };
    const result = extractAuthError(output);
    expect(result).toBeNull();
  });

  test("mcpServerId がない場合は null を返す", () => {
    const output = {
      isError: true,
      requiresReauth: true,
    };
    const result = extractAuthError(output);
    expect(result).toBeNull();
  });

  test("null 入力は null を返す", () => {
    const result = extractAuthError(null);
    expect(result).toBeNull();
  });

  test("非オブジェクト入力は null を返す", () => {
    expect(extractAuthError("string")).toBeNull();
    expect(extractAuthError(42)).toBeNull();
  });
});
