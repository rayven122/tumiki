/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-explicit-any */
import { describe, expect, test } from "vitest";

import { CalendarApi } from "../../api/calendar/index.js";
import {
  ApiError,
  CalendarError,
  CalendarNotFoundError,
  EventNotFoundError,
  PermissionDeniedError,
  QuotaExceededError,
  ValidationError,
} from "../../lib/errors/index.js";

// CalendarApiクラスのhandleApiErrorメソッドをテストするためのヘルパー
class TestableCalendarApi extends CalendarApi {
  public testHandleApiError(
    error: unknown,
    context?: { calendarId?: string; eventId?: string },
  ): CalendarError {
    return this.handleApiError(error, context);
  }
}

describe("CalendarApi - handleApiError", () => {
  const mockAuth = {
    type: "api-key",
    apiKey: "test-key",
  } as any;

  const api = new TestableCalendarApi(mockAuth);

  test("400エラーでValidationErrorを返す", () => {
    const error = {
      code: 400,
      message: "Bad Request",
    };

    const result = api.testHandleApiError(error);

    expect(result).toBeInstanceOf(ValidationError);
    expect(result.message).toBe("Bad Request");
  });

  test("403エラーでPermissionDeniedErrorを返す", () => {
    const error = {
      code: 403,
      message: "Forbidden",
    };

    const result = api.testHandleApiError(error);

    expect(result).toBeInstanceOf(PermissionDeniedError);
    expect(result.message).toBe("Forbidden");
  });

  test("404エラー - イベントIDがある場合EventNotFoundErrorを返す", () => {
    const error = {
      code: 404,
      message: "Not Found",
    };

    const result = api.testHandleApiError(error, {
      calendarId: "calendar-123",
      eventId: "event-456",
    });

    expect(result).toBeInstanceOf(EventNotFoundError);
    expect(result.message).toBe(
      "Event not found: event-456 in calendar calendar-123",
    );
  });

  test("404エラー - カレンダーIDのみの場合CalendarNotFoundErrorを返す", () => {
    const error = {
      code: 404,
      message: "Not Found",
    };

    const result = api.testHandleApiError(error, {
      calendarId: "calendar-123",
    });

    expect(result).toBeInstanceOf(CalendarNotFoundError);
    expect(result.message).toBe("Calendar not found: calendar-123");
  });

  test("404エラー - コンテキストなしの場合デフォルトCalendarNotFoundErrorを返す", () => {
    const error = {
      code: 404,
      message: "Not Found",
    };

    const result = api.testHandleApiError(error);

    expect(result).toBeInstanceOf(CalendarNotFoundError);
    expect(result.message).toBe("Calendar not found: Resource not found");
  });

  test("429エラーでQuotaExceededErrorを返す", () => {
    const error = {
      code: 429,
      message: "Too Many Requests",
    };

    const result = api.testHandleApiError(error);

    expect(result).toBeInstanceOf(QuotaExceededError);
    expect(result.message).toBe("Too Many Requests");
  });

  test("その他のHTTPエラーコードでApiErrorを返す", () => {
    const error = {
      code: 500,
      message: "Internal Server Error",
    };

    const result = api.testHandleApiError(error);

    expect(result).toBeInstanceOf(ApiError);
    expect(result.message).toBe("Internal Server Error");
  });

  test("messageプロパティがない場合デフォルトメッセージを使用", () => {
    const error = {
      code: 400,
    };

    const result = api.testHandleApiError(error);

    expect(result).toBeInstanceOf(ValidationError);
    expect(result.message).toBe("Unknown API error");
  });

  test("Errorインスタンスの場合メッセージを取得", () => {
    const error = new Error("Network error");

    const result = api.testHandleApiError(error);

    expect(result).toBeInstanceOf(CalendarError);
    expect(result.message).toBe("Network error");
  });

  test("不明なエラー形式の場合デフォルトメッセージを使用", () => {
    const error = "string error";

    const result = api.testHandleApiError(error);

    expect(result).toBeInstanceOf(CalendarError);
    expect(result.message).toBe("Unknown error");
  });

  test("nullエラーの場合デフォルトメッセージを使用", () => {
    const error = null;

    const result = api.testHandleApiError(error);

    expect(result).toBeInstanceOf(CalendarError);
    expect(result.message).toBe("Unknown error");
  });
});

describe("CalendarApi - mapCalendarListEntry", () => {
  const mockAuth = {
    type: "api-key",
    apiKey: "test-key",
  } as any;

  const api = new TestableCalendarApi(mockAuth);

  test("必須フィールドが欠けている場合エラーを投げる - idなし", () => {
    const item = {
      summary: "Test Calendar",
    };

    expect(() => (api as any).mapCalendarListEntry(item)).toThrow(
      "Invalid calendar entry: missing required fields (id: undefined, summary: Test Calendar)",
    );
  });

  test("必須フィールドが欠けている場合エラーを投げる - summaryなし", () => {
    const item = {
      id: "calendar-123",
    };

    expect(() => (api as any).mapCalendarListEntry(item)).toThrow(
      "Invalid calendar entry: missing required fields (id: calendar-123, summary: undefined)",
    );
  });

  test("両方の必須フィールドが欠けている場合エラーを投げる", () => {
    const item = {};

    expect(() => (api as any).mapCalendarListEntry(item)).toThrow(
      "Invalid calendar entry: missing required fields (id: undefined, summary: undefined)",
    );
  });

  test("有効なデータで正しくマッピングする", () => {
    const item = {
      id: "calendar-123",
      summary: "Test Calendar",
      description: "A test calendar",
      location: "Test Location",
      timeZone: "UTC",
      colorId: "1",
      backgroundColor: "#ff0000",
      foregroundColor: "#ffffff",
      selected: true,
      accessRole: "owner",
      primary: true,
      deleted: false,
      hidden: false,
    };

    const result = (api as any).mapCalendarListEntry(item);

    expect(result).toStrictEqual({
      id: "calendar-123",
      summary: "Test Calendar",
      description: "A test calendar",
      location: "Test Location",
      timeZone: "UTC",
      colorId: "1",
      backgroundColor: "#ff0000",
      foregroundColor: "#ffffff",
      selected: true,
      accessRole: "owner",
      defaultReminders: undefined,
      notificationSettings: undefined,
      primary: true,
      deleted: undefined,
      hidden: undefined,
    });
  });
});

describe("CalendarApi - mapCalendarEvent", () => {
  const mockAuth = {
    type: "api-key",
    apiKey: "test-key",
  } as any;

  const api = new TestableCalendarApi(mockAuth);

  test("基本的なイベントデータを正しくマッピングする", () => {
    const item = {
      id: "event-123",
      summary: "Test Event",
      description: "A test event",
      location: "Test Location",
      start: {
        dateTime: "2023-01-01T10:00:00Z",
        timeZone: "UTC",
      },
      end: {
        dateTime: "2023-01-01T11:00:00Z",
        timeZone: "UTC",
      },
    };

    const result = (api as any).mapCalendarEvent(item);

    expect(result.id).toBe("event-123");
    expect(result.summary).toBe("Test Event");
    expect(result.description).toBe("A test event");
    expect(result.location).toBe("Test Location");
    expect(result.start).toStrictEqual({
      date: undefined,
      dateTime: "2023-01-01T10:00:00Z",
      timeZone: "UTC",
    });
    expect(result.end).toStrictEqual({
      date: undefined,
      dateTime: "2023-01-01T11:00:00Z",
      timeZone: "UTC",
    });
  });

  test("attendees配列を正しくマッピングする（フィルタリング済み）", () => {
    const item = {
      id: "event-123",
      attendees: [
        {
          email: "user1@example.com",
          displayName: "User 1",
          responseStatus: "accepted",
        },
        {
          email: "user2@example.com",
          responseStatus: "tentative",
        },
        {
          // emailなしのため除外される
          displayName: "User 3",
          responseStatus: "declined",
        },
      ],
    };

    const result = (api as any).mapCalendarEvent(item);

    expect(result.attendees).toHaveLength(2);
    expect(result.attendees![0]).toStrictEqual({
      email: "user1@example.com",
      displayName: "User 1",
      responseStatus: "accepted",
      comment: undefined,
      additionalGuests: undefined,
      resource: undefined,
    });
    expect(result.attendees![1]).toStrictEqual({
      email: "user2@example.com",
      displayName: undefined,
      responseStatus: "tentative",
      comment: undefined,
      additionalGuests: undefined,
      resource: undefined,
    });
  });

  test("reminders設定を正しくマッピングする（フィルタリング済み）", () => {
    const item = {
      id: "event-123",
      reminders: {
        useDefault: false,
        overrides: [
          {
            method: "email",
            minutes: 60,
          },
          {
            method: "popup",
            minutes: 15,
          },
          {
            // methodなしのため除外される
            minutes: 30,
          },
          {
            method: "sms",
            // minutesなしのため除外される
          },
        ],
      },
    };

    const result = (api as any).mapCalendarEvent(item);

    expect(result.reminders).toStrictEqual({
      useDefault: undefined,
      overrides: [
        {
          method: "email",
          minutes: 60,
        },
        {
          method: "popup",
          minutes: 15,
        },
      ],
    });
  });

  test("attachments配列を正しくマッピングする（フィルタリング済み）", () => {
    const item = {
      id: "event-123",
      attachments: [
        {
          fileUrl: "https://example.com/file1.pdf",
          title: "Document 1",
          mimeType: "application/pdf",
        },
        {
          fileUrl: "https://example.com/file2.jpg",
          iconLink: "https://example.com/icon.png",
        },
        {
          // fileUrlなしのため除外される
          title: "Document 3",
          mimeType: "text/plain",
        },
      ],
    };

    const result = (api as any).mapCalendarEvent(item);

    expect(result.attachments).toHaveLength(2);
    expect(result.attachments![0]).toStrictEqual({
      fileUrl: "https://example.com/file1.pdf",
      title: "Document 1",
      mimeType: "application/pdf",
      iconLink: undefined,
      fileId: undefined,
    });
    expect(result.attachments![1]).toStrictEqual({
      fileUrl: "https://example.com/file2.jpg",
      title: undefined,
      mimeType: undefined,
      iconLink: "https://example.com/icon.png",
      fileId: undefined,
    });
  });

  test("conferenceData設定を正しくマッピングする（フィルタリング済み）", () => {
    const item = {
      id: "event-123",
      conferenceData: {
        entryPoints: [
          {
            entryPointType: "video",
            uri: "https://meet.google.com/abc-def-ghi",
            label: "Google Meet",
          },
          {
            entryPointType: "phone",
            uri: "tel:+1234567890",
            pin: "123456",
          },
          {
            // entryPointTypeなしのため除外される
            uri: "https://example.com",
          },
        ],
        conferenceId: "abc-def-ghi",
      },
    };

    const result = (api as any).mapCalendarEvent(item);

    expect(result.conferenceData?.entryPoints).toHaveLength(2);
    expect(result.conferenceData?.entryPoints![0]).toStrictEqual({
      entryPointType: "video",
      uri: "https://meet.google.com/abc-def-ghi",
      label: "Google Meet",
      pin: undefined,
      accessCode: undefined,
      meetingCode: undefined,
      passcode: undefined,
      password: undefined,
    });
    expect(result.conferenceData?.entryPoints![1]).toStrictEqual({
      entryPointType: "phone",
      uri: "tel:+1234567890",
      label: undefined,
      pin: "123456",
      accessCode: undefined,
      meetingCode: undefined,
      passcode: undefined,
      password: undefined,
    });
  });

  test("空またはundefinedの値を正しく処理する", () => {
    const item = {
      id: undefined,
      summary: undefined,
      description: "",
      attendees: [],
      reminders: {
        overrides: [],
      },
      attachments: [],
    };

    const result = (api as any).mapCalendarEvent(item);

    expect(result.id).toBeUndefined();
    expect(result.summary).toBeUndefined();
    expect(result.description).toBeUndefined();
    expect(result.attendees).toStrictEqual([]);
    expect(result.reminders?.overrides).toStrictEqual([]);
    expect(result.attachments).toStrictEqual([]);
  });

  test("conferenceData.createRequestの完全なマッピングテスト", () => {
    const item = {
      id: "event-123",
      summary: "Test Event",
      conferenceData: {
        createRequest: {
          requestId: "req-123",
          conferenceSolutionKey: {
            type: "hangoutsMeet",
          },
          status: {
            statusCode: "success",
          },
        },
      },
    };

    const result = (api as any).mapCalendarEvent(item);

    expect(result.conferenceData?.createRequest).toStrictEqual({
      requestId: "req-123",
      conferenceSolutionKey: {
        type: "hangoutsMeet",
      },
      status: {
        statusCode: "success",
      },
    });
  });

  test("conferenceData.createRequestのstatus無しパターン", () => {
    const item = {
      id: "event-123",
      summary: "Test Event",
      conferenceData: {
        createRequest: {
          requestId: "req-123",
          conferenceSolutionKey: {
            type: "hangoutsMeet",
          },
          // statusなし
        },
      },
    };

    const result = (api as any).mapCalendarEvent(item);

    expect(result.conferenceData?.createRequest).toStrictEqual({
      requestId: "req-123",
      conferenceSolutionKey: {
        type: "hangoutsMeet",
      },
      status: undefined,
    });
  });

  test("conferenceData.createRequestが無効な場合undefinedになる", () => {
    const item = {
      id: "event-123",
      summary: "Test Event",
      conferenceData: {
        createRequest: {
          // requestIdまたはconferenceSolutionKey.typeが欠けている
          requestId: "req-123",
          // conferenceSolutionKeyなし
        },
      },
    };

    const result = (api as any).mapCalendarEvent(item);

    expect(result.conferenceData?.createRequest).toBeUndefined();
  });

  test("conferenceData.conferenceSolutionの完全なマッピングテスト", () => {
    const item = {
      id: "event-123",
      summary: "Test Event",
      conferenceData: {
        conferenceSolution: {
          key: {
            type: "hangoutsMeet",
          },
          name: "Google Meet",
          iconUri: "https://example.com/icon.png",
        },
      },
    };

    const result = (api as any).mapCalendarEvent(item);

    expect(result.conferenceData?.conferenceSolution).toStrictEqual({
      key: {
        type: "hangoutsMeet",
      },
      name: "Google Meet",
      iconUri: "https://example.com/icon.png",
    });
  });

  test("conferenceData.conferenceSolutionの最小限パターン", () => {
    const item = {
      id: "event-123",
      summary: "Test Event",
      conferenceData: {
        conferenceSolution: {
          key: {
            type: "hangoutsMeet",
          },
          // nameとiconUriなし
        },
      },
    };

    const result = (api as any).mapCalendarEvent(item);

    expect(result.conferenceData?.conferenceSolution).toStrictEqual({
      key: {
        type: "hangoutsMeet",
      },
      name: undefined,
      iconUri: undefined,
    });
  });

  test("conferenceData.conferenceSolutionが無効な場合undefinedになる", () => {
    const item = {
      id: "event-123",
      summary: "Test Event",
      conferenceData: {
        conferenceSolution: {
          // key.typeが欠けている
          key: {},
        },
      },
    };

    const result = (api as any).mapCalendarEvent(item);

    expect(result.conferenceData?.conferenceSolution).toBeUndefined();
  });

  test("conferenceDataの追加プロパティマッピングテスト", () => {
    const item = {
      id: "event-123",
      summary: "Test Event",
      conferenceData: {
        conferenceId: "meet-id-123",
        signature: "signature-123",
        notes: "Meeting notes",
      },
    };

    const result = (api as any).mapCalendarEvent(item);

    expect(result.conferenceData?.conferenceId).toBe("meet-id-123");
    expect(result.conferenceData?.signature).toBe("signature-123");
    expect(result.conferenceData?.notes).toBe("Meeting notes");
  });

  test("originalStartTimeマッピングテスト", () => {
    const item = {
      id: "event-123",
      summary: "Test Event",
      originalStartTime: {
        date: "2023-01-01",
        dateTime: "2023-01-01T10:00:00Z",
        timeZone: "UTC",
      },
    };

    const result = (api as any).mapCalendarEvent(item);

    expect(result.originalStartTime).toStrictEqual({
      date: "2023-01-01",
      dateTime: "2023-01-01T10:00:00Z",
      timeZone: "UTC",
    });
  });

  test("sourceマッピングテスト（完全な情報）", () => {
    const item = {
      id: "event-123",
      summary: "Test Event",
      source: {
        url: "https://example.com/source",
        title: "Source Title",
      },
    };

    const result = (api as any).mapCalendarEvent(item);

    expect(result.source).toStrictEqual({
      url: "https://example.com/source",
      title: "Source Title",
    });
  });

  test("sourceマッピングテスト（不完全な情報）", () => {
    const item = {
      id: "event-123",
      summary: "Test Event",
      source: {
        url: "https://example.com/source",
        // titleなし
      },
    };

    const result = (api as any).mapCalendarEvent(item);

    expect(result.source).toBeUndefined();
  });
});
