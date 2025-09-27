import { describe, test, expect } from "vitest";
import {
  GoogleSheetsApiError,
  AuthenticationError,
  ValidationError,
  NetworkError,
  isGoogleSheetsApiError,
  isAuthenticationError,
  isValidationError,
  isNetworkError,
} from "../../lib/errors/index.js";

describe("GoogleSheetsApiError", () => {
  test("正常系: メッセージのみで作成する", () => {
    const message = "API error occurred";
    const error = new GoogleSheetsApiError(message);

    expect(error.message).toStrictEqual(message);
    expect(error.name).toStrictEqual("GoogleSheetsApiError");
    expect(error.statusCode).toStrictEqual(undefined);
    expect(error.details).toStrictEqual(undefined);
    expect(error instanceof Error).toStrictEqual(true);
    expect(error instanceof GoogleSheetsApiError).toStrictEqual(true);
  });

  test("正常系: メッセージとステータスコードで作成する", () => {
    const message = "Not found";
    const statusCode = 404;
    const error = new GoogleSheetsApiError(message, statusCode);

    expect(error.message).toStrictEqual(message);
    expect(error.name).toStrictEqual("GoogleSheetsApiError");
    expect(error.statusCode).toStrictEqual(statusCode);
    expect(error.details).toStrictEqual(undefined);
  });

  test("正常系: メッセージ、ステータスコード、詳細で作成する", () => {
    const message = "Validation failed";
    const statusCode = 400;
    const details = { field: "spreadsheetId", reason: "invalid format" };
    const error = new GoogleSheetsApiError(message, statusCode, details);

    expect(error.message).toStrictEqual(message);
    expect(error.name).toStrictEqual("GoogleSheetsApiError");
    expect(error.statusCode).toStrictEqual(statusCode);
    expect(error.details).toStrictEqual(details);
  });

  test("境界値: 空文字のメッセージで作成する", () => {
    const error = new GoogleSheetsApiError("");

    expect(error.message).toStrictEqual("");
    expect(error.name).toStrictEqual("GoogleSheetsApiError");
  });

  test("境界値: ステータスコード0で作成する", () => {
    const error = new GoogleSheetsApiError("Error", 0);

    expect(error.statusCode).toStrictEqual(0);
  });

  test("境界値: 負のステータスコードで作成する", () => {
    const error = new GoogleSheetsApiError("Error", -1);

    expect(error.statusCode).toStrictEqual(-1);
  });

  test("境界値: nullの詳細で作成する", () => {
    const error = new GoogleSheetsApiError("Error", 500, null);

    expect(error.details).toStrictEqual(null);
  });
});

describe("AuthenticationError", () => {
  test("正常系: メッセージのみで作成する", () => {
    const message = "Authentication failed";
    const error = new AuthenticationError(message);

    expect(error.message).toStrictEqual(message);
    expect(error.name).toStrictEqual("AuthenticationError");
    expect(error.details).toStrictEqual(undefined);
    expect(error instanceof Error).toStrictEqual(true);
    expect(error instanceof AuthenticationError).toStrictEqual(true);
  });

  test("正常系: メッセージと詳細で作成する", () => {
    const message = "Invalid credentials";
    const details = { reason: "expired token" };
    const error = new AuthenticationError(message, details);

    expect(error.message).toStrictEqual(message);
    expect(error.name).toStrictEqual("AuthenticationError");
    expect(error.details).toStrictEqual(details);
  });

  test("境界値: 空文字のメッセージで作成する", () => {
    const error = new AuthenticationError("");

    expect(error.message).toStrictEqual("");
    expect(error.name).toStrictEqual("AuthenticationError");
  });

  test("境界値: nullの詳細で作成する", () => {
    const error = new AuthenticationError("Error", null);

    expect(error.details).toStrictEqual(null);
  });
});

describe("ValidationError", () => {
  test("正常系: メッセージのみで作成する", () => {
    const message = "Validation failed";
    const error = new ValidationError(message);

    expect(error.message).toStrictEqual(message);
    expect(error.name).toStrictEqual("ValidationError");
    expect(error.details).toStrictEqual(undefined);
    expect(error instanceof Error).toStrictEqual(true);
    expect(error instanceof ValidationError).toStrictEqual(true);
  });

  test("正常系: メッセージと詳細で作成する", () => {
    const message = "Invalid input";
    const details = { field: "range", value: "invalid:range" };
    const error = new ValidationError(message, details);

    expect(error.message).toStrictEqual(message);
    expect(error.name).toStrictEqual("ValidationError");
    expect(error.details).toStrictEqual(details);
  });

  test("境界値: 空文字のメッセージで作成する", () => {
    const error = new ValidationError("");

    expect(error.message).toStrictEqual("");
    expect(error.name).toStrictEqual("ValidationError");
  });

  test("境界値: 複雑なオブジェクトの詳細で作成する", () => {
    const details = {
      errors: [
        { field: "name", message: "required" },
        { field: "age", message: "must be positive" },
      ],
      timestamp: new Date("2023-01-01"),
    };
    const error = new ValidationError("Multiple validation errors", details);

    expect(error.details).toStrictEqual(details);
  });
});

describe("NetworkError", () => {
  test("正常系: メッセージのみで作成する", () => {
    const message = "Network connection failed";
    const error = new NetworkError(message);

    expect(error.message).toStrictEqual(message);
    expect(error.name).toStrictEqual("NetworkError");
    expect(error.details).toStrictEqual(undefined);
    expect(error instanceof Error).toStrictEqual(true);
    expect(error instanceof NetworkError).toStrictEqual(true);
  });

  test("正常系: メッセージと詳細で作成する", () => {
    const message = "Connection timeout";
    const details = { timeout: 5000, retries: 3 };
    const error = new NetworkError(message, details);

    expect(error.message).toStrictEqual(message);
    expect(error.name).toStrictEqual("NetworkError");
    expect(error.details).toStrictEqual(details);
  });

  test("境界値: 空文字のメッセージで作成する", () => {
    const error = new NetworkError("");

    expect(error.message).toStrictEqual("");
    expect(error.name).toStrictEqual("NetworkError");
  });
});

describe("isGoogleSheetsApiError", () => {
  test("正常系: GoogleSheetsApiErrorインスタンスでtrueを返す", () => {
    const error = new GoogleSheetsApiError("API error");

    expect(isGoogleSheetsApiError(error)).toStrictEqual(true);
  });

  test("正常系: 通常のErrorでfalseを返す", () => {
    const error = new Error("Normal error");

    expect(isGoogleSheetsApiError(error)).toStrictEqual(false);
  });

  test("正常系: 他のカスタムエラーでfalseを返す", () => {
    const error = new AuthenticationError("Auth error");

    expect(isGoogleSheetsApiError(error)).toStrictEqual(false);
  });

  test("境界値: nullでfalseを返す", () => {
    expect(isGoogleSheetsApiError(null)).toStrictEqual(false);
  });

  test("境界値: undefinedでfalseを返す", () => {
    expect(isGoogleSheetsApiError(undefined)).toStrictEqual(false);
  });

  test("境界値: 文字列でfalseを返す", () => {
    expect(isGoogleSheetsApiError("error")).toStrictEqual(false);
  });

  test("境界値: 数値でfalseを返す", () => {
    expect(isGoogleSheetsApiError(123)).toStrictEqual(false);
  });

  test("境界値: オブジェクトでfalseを返す", () => {
    expect(isGoogleSheetsApiError({})).toStrictEqual(false);
  });
});

describe("isAuthenticationError", () => {
  test("正常系: AuthenticationErrorインスタンスでtrueを返す", () => {
    const error = new AuthenticationError("Auth error");

    expect(isAuthenticationError(error)).toStrictEqual(true);
  });

  test("正常系: 通常のErrorでfalseを返す", () => {
    const error = new Error("Normal error");

    expect(isAuthenticationError(error)).toStrictEqual(false);
  });

  test("正常系: 他のカスタムエラーでfalseを返す", () => {
    const error = new GoogleSheetsApiError("API error");

    expect(isAuthenticationError(error)).toStrictEqual(false);
  });

  test("境界値: nullでfalseを返す", () => {
    expect(isAuthenticationError(null)).toStrictEqual(false);
  });

  test("境界値: undefinedでfalseを返す", () => {
    expect(isAuthenticationError(undefined)).toStrictEqual(false);
  });
});

describe("isValidationError", () => {
  test("正常系: ValidationErrorインスタンスでtrueを返す", () => {
    const error = new ValidationError("Validation error");

    expect(isValidationError(error)).toStrictEqual(true);
  });

  test("正常系: 通常のErrorでfalseを返す", () => {
    const error = new Error("Normal error");

    expect(isValidationError(error)).toStrictEqual(false);
  });

  test("正常系: 他のカスタムエラーでfalseを返す", () => {
    const error = new NetworkError("Network error");

    expect(isValidationError(error)).toStrictEqual(false);
  });

  test("境界値: nullでfalseを返す", () => {
    expect(isValidationError(null)).toStrictEqual(false);
  });

  test("境界値: undefinedでfalseを返す", () => {
    expect(isValidationError(undefined)).toStrictEqual(false);
  });
});

describe("isNetworkError", () => {
  test("正常系: NetworkErrorインスタンスでtrueを返す", () => {
    const error = new NetworkError("Network error");

    expect(isNetworkError(error)).toStrictEqual(true);
  });

  test("正常系: 通常のErrorでfalseを返す", () => {
    const error = new Error("Normal error");

    expect(isNetworkError(error)).toStrictEqual(false);
  });

  test("正常系: 他のカスタムエラーでfalseを返す", () => {
    const error = new ValidationError("Validation error");

    expect(isNetworkError(error)).toStrictEqual(false);
  });

  test("境界値: nullでfalseを返す", () => {
    expect(isNetworkError(null)).toStrictEqual(false);
  });

  test("境界値: undefinedでfalseを返す", () => {
    expect(isNetworkError(undefined)).toStrictEqual(false);
  });
});