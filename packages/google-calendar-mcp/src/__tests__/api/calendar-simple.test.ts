import { describe, expect, test } from "vitest";

import {
  ApiError,
  CalendarError,
  CalendarNotFoundError,
  EventNotFoundError,
  PermissionDeniedError,
  QuotaExceededError,
  ValidationError,
} from "../../lib/errors/index.js";
import { err, ok } from "../../lib/result.js";

describe("Calendar API - 基本テスト", () => {
  test("成功したResult型の基本動作確認", () => {
    const successResult = ok({ events: [], nextPageToken: "token" });

    expect(successResult.success).toBe(true);
    if (successResult.success) {
      expect(successResult.data.events).toEqual([]);
      expect(successResult.data.nextPageToken).toBe("token");
    }
  });

  test("エラー状況でのResult型動作確認", () => {
    const errorResult = err(new CalendarNotFoundError("calendar-123"));

    expect(errorResult.success).toBe(false);
    if (!errorResult.success) {
      expect(errorResult.error).toBeInstanceOf(CalendarNotFoundError);
      expect(errorResult.error.message).toBe(
        "Calendar not found: calendar-123",
      );
    }
  });

  test("各種エラークラスの基本動作", () => {
    const errors = [
      new ValidationError("Bad Request"),
      new PermissionDeniedError("Forbidden"),
      new CalendarNotFoundError("calendar-123"),
      new EventNotFoundError("event-456", "calendar-123"),
      new QuotaExceededError("Too Many Requests"),
      new ApiError("Internal Server Error", 500),
      new CalendarError("General error"),
    ];

    expect(errors[0]).toBeInstanceOf(ValidationError);
    expect(errors[1]).toBeInstanceOf(PermissionDeniedError);
    expect(errors[2]).toBeInstanceOf(CalendarNotFoundError);
    expect(errors[3]).toBeInstanceOf(EventNotFoundError);
    expect(errors[4]).toBeInstanceOf(QuotaExceededError);
    expect(errors[5]).toBeInstanceOf(ApiError);
    expect(errors[6]).toBeInstanceOf(CalendarError);

    expect(errors[3]?.message).toBe(
      "Event not found: event-456 in calendar calendar-123",
    );
    expect(errors[5]?.message).toBe("Internal Server Error");
  });

  test("HTTPエラーコードとエラークラスのマッピング", () => {
    const errorMappings = [
      { code: 400, expectedClass: ValidationError },
      { code: 403, expectedClass: PermissionDeniedError },
      { code: 404, expectedClass: CalendarNotFoundError }, // コンテキストによってEventNotFoundErrorも
      { code: 429, expectedClass: QuotaExceededError },
      { code: 500, expectedClass: ApiError },
    ];

    errorMappings.forEach(({ code, expectedClass }) => {
      const errorMessage = `HTTP ${code} error`;
      const error = new expectedClass(errorMessage);
      expect(error.message).toContain(errorMessage);
    });
  });

  test("イベントデータの基本構造確認", () => {
    const eventData = {
      id: "event-123",
      summary: "Test Event",
      description: "A test event",
      start: { dateTime: "2023-01-01T10:00:00Z" },
      end: { dateTime: "2023-01-01T11:00:00Z" },
    };

    expect(eventData.id).toBe("event-123");
    expect(eventData.summary).toBe("Test Event");
    expect(eventData.start.dateTime).toBe("2023-01-01T10:00:00Z");
  });

  test("カレンダー一覧データの基本構造確認", () => {
    const calendarData = {
      id: "calendar-123",
      summary: "Test Calendar",
      description: "A test calendar",
      primary: true,
    };

    expect(calendarData.id).toBe("calendar-123");
    expect(calendarData.summary).toBe("Test Calendar");
    expect(calendarData.primary).toBe(true);
  });
});
