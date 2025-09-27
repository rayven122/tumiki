/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any */
import { describe, expect, test } from "vitest";

import { createCalendarApi } from "../../api/calendar/index.js";

describe("関数型Calendar API - 基本テスト", () => {
  test("createCalendarApiが適切な関数群を返す", () => {
    const mockAuth = {
      type: "api-key",
      apiKey: "test-key",
    } as any;

    const api = createCalendarApi({ auth: mockAuth });

    // 全ての期待される関数が存在することを確認
    expect(typeof api.listCalendars).toBe("function");
    expect(typeof api.getCalendar).toBe("function");
    expect(typeof api.listEvents).toBe("function");
    expect(typeof api.getEvent).toBe("function");
    expect(typeof api.createEvent).toBe("function");
    expect(typeof api.updateEvent).toBe("function");
    expect(typeof api.deleteEvent).toBe("function");
    expect(typeof api.getFreeBusy).toBe("function");
    expect(typeof api.getColors).toBe("function");
  });

  test("関数型APIがクラスAPIと同じインターフェースを提供する", () => {
    const mockAuth = {
      type: "api-key",
      apiKey: "test-key",
    } as any;

    const functionalApi = createCalendarApi({ auth: mockAuth });

    // 関数の存在確認
    expect(functionalApi).toHaveProperty("listCalendars");
    expect(functionalApi).toHaveProperty("getCalendar");
    expect(functionalApi).toHaveProperty("listEvents");
    expect(functionalApi).toHaveProperty("getEvent");
    expect(functionalApi).toHaveProperty("createEvent");
    expect(functionalApi).toHaveProperty("updateEvent");
    expect(functionalApi).toHaveProperty("deleteEvent");
    expect(functionalApi).toHaveProperty("getFreeBusy");
    expect(functionalApi).toHaveProperty("getColors");
  });

  test("関数型APIの設定型が正しく動作する", () => {
    const config = {
      auth: {
        type: "oauth2",
        clientId: "test-client-id",
        clientSecret: "test-client-secret",
        refreshToken: "test-refresh-token",
      } as any,
    };

    const api = createCalendarApi(config);

    expect(api).toBeDefined();
    expect(typeof api.listCalendars).toBe("function");
  });
});
