import { describe, expect, test } from "vitest";

import {
  AuthenticationError,
  GoogleSheetsApiError,
  isAuthenticationError,
  isGoogleSheetsApiError,
  isNetworkError,
  isValidationError,
  NetworkError,
  ValidationError,
} from "../../lib/errors/index.js";

describe("エラークラス", () => {
  describe("GoogleSheetsApiError", () => {
    test("エラーメッセージを保持できる", () => {
      const error = new GoogleSheetsApiError("API error");
      expect(error.message).toBe("API error");
      expect(error.name).toBe("GoogleSheetsApiError");
    });

    test("ステータスコードを保持できる", () => {
      const error = new GoogleSheetsApiError("API error", 404);
      expect(error.statusCode).toBe(404);
    });

    test("詳細情報を保持できる", () => {
      const details = { reason: "Not found" };
      const error = new GoogleSheetsApiError("API error", 404, details);
      expect(error.details).toStrictEqual(details);
    });

    test("型ガードが正しく動作する", () => {
      const error = new GoogleSheetsApiError("API error");
      expect(isGoogleSheetsApiError(error)).toBe(true);
      expect(isGoogleSheetsApiError(new Error("test"))).toBe(false);
    });
  });

  describe("AuthenticationError", () => {
    test("エラーメッセージを保持できる", () => {
      const error = new AuthenticationError("Auth failed");
      expect(error.message).toBe("Auth failed");
      expect(error.name).toBe("AuthenticationError");
    });

    test("詳細情報を保持できる", () => {
      const details = { code: "INVALID_TOKEN" };
      const error = new AuthenticationError("Auth failed", details);
      expect(error.details).toStrictEqual(details);
    });

    test("型ガードが正しく動作する", () => {
      const error = new AuthenticationError("Auth failed");
      expect(isAuthenticationError(error)).toBe(true);
      expect(isAuthenticationError(new Error("test"))).toBe(false);
    });
  });

  describe("ValidationError", () => {
    test("エラーメッセージを保持できる", () => {
      const error = new ValidationError("Invalid input");
      expect(error.message).toBe("Invalid input");
      expect(error.name).toBe("ValidationError");
    });

    test("詳細情報を保持できる", () => {
      const details = { field: "email", reason: "invalid format" };
      const error = new ValidationError("Invalid input", details);
      expect(error.details).toStrictEqual(details);
    });

    test("型ガードが正しく動作する", () => {
      const error = new ValidationError("Invalid input");
      expect(isValidationError(error)).toBe(true);
      expect(isValidationError(new Error("test"))).toBe(false);
    });
  });

  describe("NetworkError", () => {
    test("エラーメッセージを保持できる", () => {
      const error = new NetworkError("Connection failed");
      expect(error.message).toBe("Connection failed");
      expect(error.name).toBe("NetworkError");
    });

    test("詳細情報を保持できる", () => {
      const details = { timeout: 5000 };
      const error = new NetworkError("Connection failed", details);
      expect(error.details).toStrictEqual(details);
    });

    test("型ガードが正しく動作する", () => {
      const error = new NetworkError("Connection failed");
      expect(isNetworkError(error)).toBe(true);
      expect(isNetworkError(new Error("test"))).toBe(false);
    });
  });

  describe("エラーインスタンスの判別", () => {
    test("異なるエラータイプを正しく判別できる", () => {
      const apiError = new GoogleSheetsApiError("API error");
      const authError = new AuthenticationError("Auth error");
      const validationError = new ValidationError("Validation error");
      const networkError = new NetworkError("Network error");

      expect(isGoogleSheetsApiError(apiError)).toBe(true);
      expect(isGoogleSheetsApiError(authError)).toBe(false);

      expect(isAuthenticationError(authError)).toBe(true);
      expect(isAuthenticationError(validationError)).toBe(false);

      expect(isValidationError(validationError)).toBe(true);
      expect(isValidationError(networkError)).toBe(false);

      expect(isNetworkError(networkError)).toBe(true);
      expect(isNetworkError(apiError)).toBe(false);
    });
  });
});
