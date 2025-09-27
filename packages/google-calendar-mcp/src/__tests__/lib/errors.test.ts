import { describe, expect, test } from "vitest";

import {
  ApiError,
  AuthenticationError,
  CalendarError,
  CalendarNotFoundError,
  EventNotFoundError,
  PermissionDeniedError,
  QuotaExceededError,
  ValidationError,
} from "../../lib/errors/index.js";

describe("CalendarError", () => {
  test("基本のエラーメッセージとコードを正しく設定する", () => {
    const error = new CalendarError("Test error", "TEST_CODE");

    expect(error.message).toBe("Test error");
    expect(error.code).toBe("TEST_CODE");
    expect(error.name).toBe("CalendarError");
    expect(error).toBeInstanceOf(Error);
  });

  test("コードが未指定の場合はundefinedになる", () => {
    const error = new CalendarError("Test error");

    expect(error.message).toBe("Test error");
    expect(error.code).toBeUndefined();
    expect(error.name).toBe("CalendarError");
  });
});

describe("AuthenticationError", () => {
  test("認証エラーの詳細を正しく設定する", () => {
    const error = new AuthenticationError("Authentication failed");

    expect(error.message).toBe("Authentication failed");
    expect(error.code).toBe("AUTH_ERROR");
    expect(error.name).toBe("AuthenticationError");
    expect(error).toBeInstanceOf(CalendarError);
  });
});

describe("ValidationError", () => {
  test("バリデーションエラーの詳細を正しく設定する", () => {
    const error = new ValidationError("Invalid input");

    expect(error.message).toBe("Invalid input");
    expect(error.code).toBe("VALIDATION_ERROR");
    expect(error.name).toBe("ValidationError");
    expect(error).toBeInstanceOf(CalendarError);
  });
});

describe("ApiError", () => {
  test("APIエラーの詳細を正しく設定する", () => {
    const error = new ApiError(
      "API request failed",
      500,
      "Internal Server Error",
    );

    expect(error.message).toBe("API request failed");
    expect(error.code).toBe("API_ERROR");
    expect(error.name).toBe("ApiError");
    expect(error.statusCode).toBe(500);
    expect(error.statusText).toBe("Internal Server Error");
    expect(error).toBeInstanceOf(CalendarError);
  });

  test("ステータスコードとテキストが未指定の場合はundefinedになる", () => {
    const error = new ApiError("API request failed");

    expect(error.message).toBe("API request failed");
    expect(error.statusCode).toBeUndefined();
    expect(error.statusText).toBeUndefined();
  });
});

describe("CalendarNotFoundError", () => {
  test("カレンダー未発見エラーのメッセージを正しく生成する", () => {
    const error = new CalendarNotFoundError("calendar-123");

    expect(error.message).toBe("Calendar not found: calendar-123");
    expect(error.code).toBe("CALENDAR_NOT_FOUND");
    expect(error.name).toBe("CalendarNotFoundError");
    expect(error).toBeInstanceOf(CalendarError);
  });
});

describe("EventNotFoundError", () => {
  test("イベント未発見エラーのメッセージを正しく生成する（カレンダーID付き）", () => {
    const error = new EventNotFoundError("event-123", "calendar-456");

    expect(error.message).toBe(
      "Event not found: event-123 in calendar calendar-456",
    );
    expect(error.code).toBe("EVENT_NOT_FOUND");
    expect(error.name).toBe("EventNotFoundError");
    expect(error).toBeInstanceOf(CalendarError);
  });

  test("イベント未発見エラーのメッセージを正しく生成する（カレンダーIDなし）", () => {
    const error = new EventNotFoundError("event-123");

    expect(error.message).toBe("Event not found: event-123");
    expect(error.code).toBe("EVENT_NOT_FOUND");
    expect(error.name).toBe("EventNotFoundError");
  });
});

describe("PermissionDeniedError", () => {
  test("権限拒否エラーの詳細を正しく設定する", () => {
    const error = new PermissionDeniedError("Access denied");

    expect(error.message).toBe("Access denied");
    expect(error.code).toBe("PERMISSION_DENIED");
    expect(error.name).toBe("PermissionDeniedError");
    expect(error).toBeInstanceOf(CalendarError);
  });
});

describe("QuotaExceededError", () => {
  test("クォータ超過エラーの詳細を正しく設定する", () => {
    const error = new QuotaExceededError("Quota exceeded");

    expect(error.message).toBe("Quota exceeded");
    expect(error.code).toBe("QUOTA_EXCEEDED");
    expect(error.name).toBe("QuotaExceededError");
    expect(error).toBeInstanceOf(CalendarError);
  });
});
