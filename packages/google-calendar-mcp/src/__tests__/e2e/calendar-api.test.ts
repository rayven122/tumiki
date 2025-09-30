/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/dot-notation */
import type { calendar_v3 } from "googleapis";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import type { CalendarEvent } from "../../api/types.js";
import { createCalendarApi } from "../../api/calendar/index.js";

// Google APIのモック
const mockCalendarApi = {
  calendars: {
    get: vi.fn(),
  },
  calendarList: {
    list: vi.fn(),
    get: vi.fn(),
  },
  events: {
    list: vi.fn(),
    get: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  freebusy: {
    query: vi.fn(),
  },
  colors: {
    get: vi.fn(),
  },
};

// google.calendarのモック
vi.mock("googleapis", () => ({
  google: {
    calendar: vi.fn(() => mockCalendarApi),
  },
}));

describe("Google Calendar API E2E Tests", () => {
  let calendarApi: ReturnType<typeof createCalendarApi>;
  const mockAuth = { type: "api-key", apiKey: "test-key" } as any;

  beforeEach(() => {
    calendarApi = createCalendarApi({ auth: mockAuth });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("listCalendars", () => {
    const mockCalendarListResponse: calendar_v3.Schema$CalendarList = {
      kind: "calendar#calendarList",
      etag: "test-etag",
      nextPageToken: "next-token",
      items: [
        {
          kind: "calendar#calendarListEntry",
          etag: "item-etag",
          id: "primary",
          summary: "Primary Calendar",
          description: "Main calendar for testing",
          location: "Tokyo",
          timeZone: "Asia/Tokyo",
          colorId: "1",
          backgroundColor: "#9fc6e7",
          foregroundColor: "#000000",
          selected: true,
          accessRole: "owner",
          defaultReminders: [
            { method: "email", minutes: 10 },
            { method: "popup", minutes: 5 },
          ],
          primary: true,
        },
        {
          id: "work-calendar",
          summary: "Work Calendar",
          description: "Calendar for work events",
          timeZone: "Asia/Tokyo",
          colorId: "2",
          backgroundColor: "#7bd148",
          foregroundColor: "#000000",
          accessRole: "writer",
        },
      ],
    };

    test("正常系: カレンダーリストを取得できる", async () => {
      mockCalendarApi.calendarList.list.mockResolvedValueOnce({
        data: mockCalendarListResponse,
      });

      const result = await calendarApi.listCalendars({ maxResults: 10 });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.calendars).toHaveLength(2);
        expect(result.value.calendars[0]?.id).toBe("primary");
        expect(result.value.calendars[0]?.summary).toBe("Primary Calendar");
        expect(result.value.calendars[1]?.id).toBe("work-calendar");
        expect(result.value.nextPageToken).toBe("next-token");
      }

      expect(mockCalendarApi.calendarList.list).toHaveBeenCalledWith({
        maxResults: 10,
        pageToken: undefined,
        showDeleted: undefined,
        showHidden: undefined,
      });
    });

    test("正常系: ページネーションパラメータを渡せる", async () => {
      mockCalendarApi.calendarList.list.mockResolvedValueOnce({
        data: mockCalendarListResponse,
      });

      const result = await calendarApi.listCalendars({
        maxResults: 5,
        pageToken: "previous-token",
        showDeleted: true,
        showHidden: true,
      });

      expect(result.ok).toBe(true);
      expect(mockCalendarApi.calendarList.list).toHaveBeenCalledWith({
        maxResults: 5,
        pageToken: "previous-token",
        showDeleted: true,
        showHidden: true,
      });
    });

    test("異常系: APIエラーが適切にハンドリングされる", async () => {
      mockCalendarApi.calendarList.list.mockRejectedValueOnce({
        response: {
          status: 401,
          data: { error: { message: "Unauthorized" } },
        },
      });

      const result = await calendarApi.listCalendars();

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain("Authentication failed");
      }
    });
  });

  describe("getCalendar", () => {
    const mockCalendarEntry: calendar_v3.Schema$CalendarListEntry = {
      id: "primary",
      summary: "Primary Calendar",
      description: "Main calendar",
      timeZone: "Asia/Tokyo",
      colorId: "1",
      backgroundColor: "#9fc6e7",
      foregroundColor: "#000000",
      selected: true,
      accessRole: "owner",
      primary: true,
    };

    test("正常系: 特定のカレンダー情報を取得できる", async () => {
      mockCalendarApi.calendarList.get.mockResolvedValueOnce({
        data: mockCalendarEntry,
      });

      const result = await calendarApi.getCalendar("primary");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.id).toBe("primary");
        expect(result.value.summary).toBe("Primary Calendar");
        expect(result.value.timeZone).toBe("Asia/Tokyo");
      }

      expect(mockCalendarApi.calendarList.get).toHaveBeenCalledWith({
        calendarId: "primary",
      });
    });

    test("異常系: 存在しないカレンダーIDの場合404エラー", async () => {
      mockCalendarApi.calendarList.get.mockRejectedValueOnce({
        response: {
          status: 404,
          data: { error: { message: "Not Found" } },
        },
      });

      const result = await calendarApi.getCalendar("non-existent");

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain("Calendar not found");
      }
    });
  });

  describe("listEvents", () => {
    const mockEventsResponse: calendar_v3.Schema$Events = {
      kind: "calendar#events",
      etag: "test-etag",
      summary: "Primary Calendar",
      updated: "2024-01-01T00:00:00Z",
      timeZone: "Asia/Tokyo",
      nextPageToken: "event-next-token",
      items: [
        {
          kind: "calendar#event",
          etag: "event-etag",
          id: "event-1",
          status: "confirmed",
          htmlLink: "https://calendar.google.com/event?eid=xxx",
          created: "2024-01-01T00:00:00Z",
          updated: "2024-01-01T00:00:00Z",
          summary: "Team Meeting",
          description: "Weekly team sync",
          location: "Conference Room A",
          creator: {
            email: "creator@example.com",
            displayName: "Creator User",
          },
          organizer: {
            email: "organizer@example.com",
            displayName: "Organizer User",
            self: true,
          },
          start: {
            dateTime: "2024-01-15T10:00:00+09:00",
            timeZone: "Asia/Tokyo",
          },
          end: {
            dateTime: "2024-01-15T11:00:00+09:00",
            timeZone: "Asia/Tokyo",
          },
          attendees: [
            {
              email: "attendee1@example.com",
              displayName: "Attendee 1",
              responseStatus: "accepted",
            },
            {
              email: "attendee2@example.com",
              displayName: "Attendee 2",
              responseStatus: "tentative",
            },
          ],
          reminders: {
            useDefault: false,
            overrides: [
              { method: "email", minutes: 30 },
              { method: "popup", minutes: 10 },
            ],
          },
        },
        {
          id: "event-2",
          summary: "All Day Event",
          description: "Company Holiday",
          start: {
            date: "2024-01-20",
          },
          end: {
            date: "2024-01-21",
          },
          transparency: "transparent",
        },
      ],
    };

    test("正常系: イベントリストを取得できる", async () => {
      mockCalendarApi.events.list.mockResolvedValueOnce({
        data: mockEventsResponse,
      });

      const result = await calendarApi.listEvents("primary", {
        timeMin: "2024-01-01T00:00:00Z",
        timeMax: "2024-01-31T23:59:59Z",
        maxResults: 10,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.events).toHaveLength(2);
        expect(result.value.events[0]?.summary).toBe("Team Meeting");
        expect(result.value.events[0]?.attendees).toHaveLength(2);
        expect(result.value.events[1]?.summary).toBe("All Day Event");
        expect(result.value.nextPageToken).toBe("event-next-token");
      }

      expect(mockCalendarApi.events.list).toHaveBeenCalledWith({
        calendarId: "primary",
        timeMin: "2024-01-01T00:00:00Z",
        timeMax: "2024-01-31T23:59:59Z",
        maxResults: 10,
        pageToken: undefined,
        q: undefined,
        singleEvents: undefined,
        orderBy: undefined,
        showDeleted: undefined,
      });
    });

    test("正常系: 検索クエリでイベントをフィルタできる", async () => {
      mockCalendarApi.events.list.mockResolvedValueOnce({
        data: mockEventsResponse,
      });

      const result = await calendarApi.listEvents("primary", {
        q: "meeting",
        singleEvents: true,
        orderBy: "startTime",
      });

      expect(result.ok).toBe(true);
      expect(mockCalendarApi.events.list).toHaveBeenCalledWith({
        calendarId: "primary",
        q: "meeting",
        singleEvents: true,
        orderBy: "startTime",
        timeMin: undefined,
        timeMax: undefined,
        maxResults: undefined,
        pageToken: undefined,
        showDeleted: undefined,
      });
    });
  });

  describe("createEvent", () => {
    const newEvent: CalendarEvent = {
      summary: "New Meeting",
      description: "Discussion about Q2 plans",
      location: "Online",
      start: {
        dateTime: "2024-02-01T14:00:00+09:00",
        timeZone: "Asia/Tokyo",
      },
      end: {
        dateTime: "2024-02-01T15:00:00+09:00",
        timeZone: "Asia/Tokyo",
      },
      attendees: [
        {
          email: "participant@example.com",
          displayName: "Participant",
        },
      ],
      reminders: {
        useDefault: false,
        overrides: [{ method: "email", minutes: 60 }],
      },
    };

    const createdEventResponse: calendar_v3.Schema$Event = {
      ...newEvent,
      id: "created-event-id",
      status: "confirmed",
      htmlLink: "https://calendar.google.com/event?eid=yyy",
      created: "2024-01-25T00:00:00Z",
      updated: "2024-01-25T00:00:00Z",
      creator: {
        email: "creator@example.com",
        self: true,
      },
      organizer: {
        email: "creator@example.com",
        self: true,
      },
    };

    test("正常系: イベントを作成できる", async () => {
      mockCalendarApi.events.insert.mockResolvedValueOnce({
        data: createdEventResponse,
      });

      const result = await calendarApi.createEvent("primary", newEvent, {
        sendNotifications: true,
        sendUpdates: "all",
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.id).toBe("created-event-id");
        expect(result.value.summary).toBe("New Meeting");
        expect(result.value.status).toBe("confirmed");
      }

      expect(mockCalendarApi.events.insert).toHaveBeenCalledWith({
        calendarId: "primary",
        requestBody: newEvent,
        sendNotifications: true,
        sendUpdates: "all",
      });
    });

    test("異常系: 必須フィールドが不足している場合エラー", async () => {
      mockCalendarApi.events.insert.mockRejectedValueOnce({
        response: {
          status: 400,
          data: { error: { message: "Invalid request" } },
        },
      });

      const invalidEvent: CalendarEvent = {
        summary: "Invalid Event",
        // start/endが不足
      };

      const result = await calendarApi.createEvent("primary", invalidEvent);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain("Validation failed");
      }
    });
  });

  describe("updateEvent", () => {
    const updatedEvent: CalendarEvent = {
      summary: "Updated Meeting",
      description: "Updated description",
      start: {
        dateTime: "2024-02-01T15:00:00+09:00",
        timeZone: "Asia/Tokyo",
      },
      end: {
        dateTime: "2024-02-01T16:00:00+09:00",
        timeZone: "Asia/Tokyo",
      },
    };

    test("正常系: イベントを更新できる", async () => {
      mockCalendarApi.events.update.mockResolvedValueOnce({
        data: {
          ...updatedEvent,
          id: "event-1",
          updated: "2024-01-26T00:00:00Z",
        },
      });

      const result = await calendarApi.updateEvent(
        "primary",
        "event-1",
        updatedEvent,
        { sendNotifications: true },
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.summary).toBe("Updated Meeting");
      }

      expect(mockCalendarApi.events.update).toHaveBeenCalledWith({
        calendarId: "primary",
        eventId: "event-1",
        requestBody: updatedEvent,
        sendNotifications: true,
        sendUpdates: undefined,
      });
    });
  });

  describe("deleteEvent", () => {
    test("正常系: イベントを削除できる", async () => {
      mockCalendarApi.events.delete.mockResolvedValueOnce({});

      const result = await calendarApi.deleteEvent("primary", "event-1", {
        sendNotifications: true,
        sendUpdates: "all",
      });

      expect(result.ok).toBe(true);
      expect(mockCalendarApi.events.delete).toHaveBeenCalledWith({
        calendarId: "primary",
        eventId: "event-1",
        sendNotifications: true,
        sendUpdates: "all",
      });
    });

    test("異常系: 存在しないイベントの削除は404エラー", async () => {
      mockCalendarApi.events.delete.mockRejectedValueOnce({
        response: {
          status: 404,
          data: { error: { message: "Not Found" } },
        },
      });

      const result = await calendarApi.deleteEvent("primary", "non-existent");

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain("Event not found");
      }
    });
  });

  describe("getFreeBusy", () => {
    const mockFreeBusyResponse: calendar_v3.Schema$FreeBusyResponse = {
      kind: "calendar#freeBusy",
      timeMin: "2024-02-01T00:00:00Z",
      timeMax: "2024-02-02T00:00:00Z",
      calendars: {
        primary: {
          busy: [
            {
              start: "2024-02-01T09:00:00Z",
              end: "2024-02-01T10:00:00Z",
            },
            {
              start: "2024-02-01T14:00:00Z",
              end: "2024-02-01T15:00:00Z",
            },
          ],
        },
        "work-calendar": {
          busy: [
            {
              start: "2024-02-01T11:00:00Z",
              end: "2024-02-01T12:00:00Z",
            },
          ],
        },
      },
    };

    test("正常系: Free/Busy情報を取得できる", async () => {
      mockCalendarApi.freebusy.query.mockResolvedValueOnce({
        data: mockFreeBusyResponse,
      });

      const result = await calendarApi.getFreeBusy({
        timeMin: "2024-02-01T00:00:00Z",
        timeMax: "2024-02-02T00:00:00Z",
        items: [{ id: "primary" }, { id: "work-calendar" }],
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.calendars).toBeDefined();
        expect(result.value.calendars?.["primary"]?.busy).toHaveLength(2);
        expect(result.value.calendars?.["work-calendar"]?.busy).toHaveLength(1);
      }

      expect(mockCalendarApi.freebusy.query).toHaveBeenCalledWith({
        requestBody: {
          timeMin: "2024-02-01T00:00:00Z",
          timeMax: "2024-02-02T00:00:00Z",
          items: [{ id: "primary" }, { id: "work-calendar" }],
        },
      });
    });
  });

  describe("getColors", () => {
    const mockColorsResponse: calendar_v3.Schema$Colors = {
      kind: "calendar#colors",
      updated: "2024-01-01T00:00:00Z",
      calendar: {
        "1": {
          background: "#ac725e",
          foreground: "#ffffff",
        },
        "2": {
          background: "#d06b64",
          foreground: "#ffffff",
        },
      },
      event: {
        "1": {
          background: "#a4bdfc",
          foreground: "#1d1d1d",
        },
        "2": {
          background: "#7ae7bf",
          foreground: "#1d1d1d",
        },
      },
    };

    test("正常系: カラー情報を取得できる", async () => {
      mockCalendarApi.colors.get.mockResolvedValueOnce({
        data: mockColorsResponse,
      });

      const result = await calendarApi.getColors();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.calendar).toBeDefined();
        expect(result.value.calendar?.["1"]?.background).toBe("#ac725e");
        expect(result.value.event).toBeDefined();
        expect(result.value.event?.["1"]?.background).toBe("#a4bdfc");
      }

      expect(mockCalendarApi.colors.get).toHaveBeenCalled();
    });
  });
});
