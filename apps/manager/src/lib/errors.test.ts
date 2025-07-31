import { describe, test, expect, vi } from "vitest";
import {
  type ErrorType,
  type Surface,
  type ErrorCode,
  type ErrorVisibility,
  visibilityBySurface,
  ChatSDKError,
  getMessageByErrorCode,
} from "./errors";

describe("visibilityBySurface", () => {
  test("正常系: database の可視性が log である", () => {
    expect(visibilityBySurface.database).toStrictEqual("log");
  });

  test("正常系: chat の可視性が response である", () => {
    expect(visibilityBySurface.chat).toStrictEqual("response");
  });

  test("正常系: auth の可視性が response である", () => {
    expect(visibilityBySurface.auth).toStrictEqual("response");
  });

  test("正常系: stream の可視性が response である", () => {
    expect(visibilityBySurface.stream).toStrictEqual("response");
  });

  test("正常系: api の可視性が response である", () => {
    expect(visibilityBySurface.api).toStrictEqual("response");
  });

  test("正常系: history の可視性が response である", () => {
    expect(visibilityBySurface.history).toStrictEqual("response");
  });

  test("正常系: vote の可視性が response である", () => {
    expect(visibilityBySurface.vote).toStrictEqual("response");
  });

  test("正常系: document の可視性が response である", () => {
    expect(visibilityBySurface.document).toStrictEqual("response");
  });

  test("正常系: suggestions の可視性が response である", () => {
    expect(visibilityBySurface.suggestions).toStrictEqual("response");
  });

  test("正常系: すべての Surface が定義されている", () => {
    const surfaces: Surface[] = [
      "chat",
      "auth",
      "api",
      "stream",
      "database",
      "history",
      "vote",
      "document",
      "suggestions",
    ];
    surfaces.forEach((surface) => {
      expect(visibilityBySurface).toHaveProperty(surface);
    });
  });
});

describe("ChatSDKError", () => {
  test("正常系: bad_request:api エラーを正しく構築する", () => {
    const error = new ChatSDKError("bad_request:api");
    expect(error.type).toStrictEqual("bad_request");
    expect(error.surface).toStrictEqual("api");
    expect(error.statusCode).toStrictEqual(400);
    expect(error.message).toStrictEqual(
      "The request couldn't be processed. Please check your input and try again.",
    );
    expect(error.cause).toBeUndefined();
  });

  test("正常系: unauthorized:auth エラーを cause 付きで構築する", () => {
    const cause = "Invalid token";
    const error = new ChatSDKError("unauthorized:auth", cause);
    expect(error.type).toStrictEqual("unauthorized");
    expect(error.surface).toStrictEqual("auth");
    expect(error.statusCode).toStrictEqual(401);
    expect(error.message).toStrictEqual(
      "You need to sign in before continuing.",
    );
    expect(error.cause).toStrictEqual(cause);
  });

  test("正常系: forbidden:chat エラーを正しく構築する", () => {
    const error = new ChatSDKError("forbidden:chat");
    expect(error.type).toStrictEqual("forbidden");
    expect(error.surface).toStrictEqual("chat");
    expect(error.statusCode).toStrictEqual(403);
    expect(error.message).toStrictEqual(
      "This chat belongs to another user. Please check the chat ID and try again.",
    );
  });

  test("正常系: not_found:document エラーを正しく構築する", () => {
    const error = new ChatSDKError("not_found:document");
    expect(error.type).toStrictEqual("not_found");
    expect(error.surface).toStrictEqual("document");
    expect(error.statusCode).toStrictEqual(404);
    expect(error.message).toStrictEqual(
      "The requested document was not found. Please check the document ID and try again.",
    );
  });

  test("正常系: rate_limit:chat エラーを正しく構築する", () => {
    const error = new ChatSDKError("rate_limit:chat");
    expect(error.type).toStrictEqual("rate_limit");
    expect(error.surface).toStrictEqual("chat");
    expect(error.statusCode).toStrictEqual(429);
    expect(error.message).toStrictEqual(
      "You have exceeded your maximum number of messages for the day. Please try again later.",
    );
  });

  test("正常系: offline:chat エラーを正しく構築する", () => {
    const error = new ChatSDKError("offline:chat");
    expect(error.type).toStrictEqual("offline");
    expect(error.surface).toStrictEqual("chat");
    expect(error.statusCode).toStrictEqual(503);
    expect(error.message).toStrictEqual(
      "We're having trouble sending your message. Please check your internet connection and try again.",
    );
  });

  test("正常系: bad_request:database エラーを正しく構築する", () => {
    const error = new ChatSDKError("bad_request:database");
    expect(error.type).toStrictEqual("bad_request");
    expect(error.surface).toStrictEqual("database");
    expect(error.statusCode).toStrictEqual(400);
    expect(error.message).toStrictEqual(
      "An error occurred while executing a database query.",
    );
  });

  describe("toResponse", () => {
    test("正常系: database エラーの場合、ログに出力して汎用メッセージを返す", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => undefined);
      const error = new ChatSDKError(
        "bad_request:database",
        "Connection failed",
      );
      const response = error.toResponse();

      expect(consoleSpy).toHaveBeenCalledWith({
        code: "bad_request:database",
        message: "An error occurred while executing a database query.",
        cause: "Connection failed",
      });

      expect(response.status).toStrictEqual(400);
      const body = (await response.json()) as Record<string, unknown>;
      expect(body).toStrictEqual({
        code: "",
        message: "Something went wrong. Please try again later.",
      });

      consoleSpy.mockRestore();
    });

    test("正常系: chat エラーの場合、詳細情報を含むレスポンスを返す", async () => {
      const error = new ChatSDKError("not_found:chat", "Chat ID: 12345");
      const response = error.toResponse();

      expect(response.status).toStrictEqual(404);
      const body = (await response.json()) as Record<string, unknown>;
      expect(body).toStrictEqual({
        code: "not_found:chat",
        message:
          "The requested chat was not found. Please check the chat ID and try again.",
        cause: "Chat ID: 12345",
      });
    });

    test("正常系: cause なしの auth エラーの場合、レスポンスに cause が含まれない", async () => {
      const error = new ChatSDKError("unauthorized:auth");
      const response = error.toResponse();

      expect(response.status).toStrictEqual(401);
      const body = (await response.json()) as Record<string, unknown>;
      expect(body).toStrictEqual({
        code: "unauthorized:auth",
        message: "You need to sign in before continuing.",
      });
    });

    test("正常系: すべての Surface でログ出力または詳細レスポンスが返される", () => {
      const surfaces: Surface[] = [
        "chat",
        "auth",
        "api",
        "stream",
        "database",
        "history",
        "vote",
        "document",
        "suggestions",
      ];

      surfaces.forEach((surface) => {
        const errorCode: ErrorCode = `bad_request:${surface}`;
        const error = new ChatSDKError(errorCode);
        const response = error.toResponse();
        expect(response.status).toStrictEqual(400);
      });
    });
  });
});

describe("getMessageByErrorCode", () => {
  test("正常系: database を含むエラーコードで database メッセージを返す", () => {
    expect(getMessageByErrorCode("bad_request:database")).toStrictEqual(
      "An error occurred while executing a database query.",
    );
    expect(getMessageByErrorCode("unauthorized:database")).toStrictEqual(
      "An error occurred while executing a database query.",
    );
    expect(getMessageByErrorCode("not_found:database")).toStrictEqual(
      "An error occurred while executing a database query.",
    );
  });

  test("正常系: bad_request:api のメッセージを返す", () => {
    expect(getMessageByErrorCode("bad_request:api")).toStrictEqual(
      "The request couldn't be processed. Please check your input and try again.",
    );
  });

  test("正常系: unauthorized:auth のメッセージを返す", () => {
    expect(getMessageByErrorCode("unauthorized:auth")).toStrictEqual(
      "You need to sign in before continuing.",
    );
  });

  test("正常系: forbidden:auth のメッセージを返す", () => {
    expect(getMessageByErrorCode("forbidden:auth")).toStrictEqual(
      "Your account does not have access to this feature.",
    );
  });

  test("正常系: rate_limit:chat のメッセージを返す", () => {
    expect(getMessageByErrorCode("rate_limit:chat")).toStrictEqual(
      "You have exceeded your maximum number of messages for the day. Please try again later.",
    );
  });

  test("正常系: not_found:chat のメッセージを返す", () => {
    expect(getMessageByErrorCode("not_found:chat")).toStrictEqual(
      "The requested chat was not found. Please check the chat ID and try again.",
    );
  });

  test("正常系: forbidden:chat のメッセージを返す", () => {
    expect(getMessageByErrorCode("forbidden:chat")).toStrictEqual(
      "This chat belongs to another user. Please check the chat ID and try again.",
    );
  });

  test("正常系: unauthorized:chat のメッセージを返す", () => {
    expect(getMessageByErrorCode("unauthorized:chat")).toStrictEqual(
      "You need to sign in to view this chat. Please sign in and try again.",
    );
  });

  test("正常系: offline:chat のメッセージを返す", () => {
    expect(getMessageByErrorCode("offline:chat")).toStrictEqual(
      "We're having trouble sending your message. Please check your internet connection and try again.",
    );
  });

  test("正常系: not_found:document のメッセージを返す", () => {
    expect(getMessageByErrorCode("not_found:document")).toStrictEqual(
      "The requested document was not found. Please check the document ID and try again.",
    );
  });

  test("正常系: forbidden:document のメッセージを返す", () => {
    expect(getMessageByErrorCode("forbidden:document")).toStrictEqual(
      "This document belongs to another user. Please check the document ID and try again.",
    );
  });

  test("正常系: unauthorized:document のメッセージを返す", () => {
    expect(getMessageByErrorCode("unauthorized:document")).toStrictEqual(
      "You need to sign in to view this document. Please sign in and try again.",
    );
  });

  test("正常系: bad_request:document のメッセージを返す", () => {
    expect(getMessageByErrorCode("bad_request:document")).toStrictEqual(
      "The request to create or update the document was invalid. Please check your input and try again.",
    );
  });

  test("正常系: 未定義のエラーコードでデフォルトメッセージを返す", () => {
    expect(
      getMessageByErrorCode("bad_request:unknown" as ErrorCode),
    ).toStrictEqual("Something went wrong. Please try again later.");
    expect(getMessageByErrorCode("unknown:chat" as ErrorCode)).toStrictEqual(
      "Something went wrong. Please try again later.",
    );
  });
});

describe("getStatusCodeByType（内部関数のテスト）", () => {
  test("正常系: 各エラータイプが正しいステータスコードにマッピングされる", () => {
    const testCases: Array<{ type: ErrorType; expectedCode: number }> = [
      { type: "bad_request", expectedCode: 400 },
      { type: "unauthorized", expectedCode: 401 },
      { type: "forbidden", expectedCode: 403 },
      { type: "not_found", expectedCode: 404 },
      { type: "rate_limit", expectedCode: 429 },
      { type: "offline", expectedCode: 503 },
    ];

    testCases.forEach(({ type, expectedCode }) => {
      const error = new ChatSDKError(`${type}:chat`);
      expect(error.statusCode).toStrictEqual(expectedCode);
    });
  });

  test("境界値: 未定義のエラータイプで 500 を返す", () => {
    // エラーコードの分割で未知のタイプになった場合のテスト
    const error = new ChatSDKError("unknown:chat" as ErrorCode);
    expect(error.statusCode).toStrictEqual(500);
  });
});

describe("型定義のテスト", () => {
  test("正常系: ErrorType が期待される値を持つ", () => {
    const validTypes: ErrorType[] = [
      "bad_request",
      "unauthorized",
      "forbidden",
      "not_found",
      "rate_limit",
      "offline",
    ];
    expect(validTypes).toHaveLength(6);
  });

  test("正常系: Surface が期待される値を持つ", () => {
    const validSurfaces: Surface[] = [
      "chat",
      "auth",
      "api",
      "stream",
      "database",
      "history",
      "vote",
      "document",
      "suggestions",
    ];
    expect(validSurfaces).toHaveLength(9);
  });

  test("正常系: ErrorVisibility が期待される値を持つ", () => {
    const validVisibilities: ErrorVisibility[] = ["response", "log", "none"];
    expect(validVisibilities).toHaveLength(3);
  });

  test("正常系: ErrorCode が正しい形式である", () => {
    const validErrorCodes: ErrorCode[] = [
      "bad_request:api",
      "unauthorized:auth",
      "forbidden:chat",
      "not_found:document",
      "rate_limit:chat",
      "offline:chat",
    ];
    validErrorCodes.forEach((code) => {
      expect(code).toMatch(/^[a-z_]+:[a-z]+$/);
    });
  });
});
