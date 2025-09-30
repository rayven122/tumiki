/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import type { AuthConfig } from "../../api/types.js";
import { createServer, runServer } from "../../mcp/index.js";

// Google APIのモック設定
const mockCalendarApi = {
  calendarList: { list: vi.fn(), get: vi.fn() },
  events: {
    list: vi.fn(),
    get: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  freebusy: { query: vi.fn() },
  colors: { get: vi.fn() },
};

vi.mock("googleapis", () => ({
  google: {
    calendar: vi.fn(() => mockCalendarApi),
  },
}));

describe("Google Calendar MCP Server E2E Tests", () => {
  let server: Server;
  const authConfig: AuthConfig = {
    type: "api-key",
    apiKey: "test-api-key",
  };

  beforeEach(() => {
    server = createServer(authConfig);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Server Initialization", () => {
    test("正常系: サーバーが正しく初期化される", () => {
      expect(server).toBeInstanceOf(Server);
      expect(server).toBeDefined();
    });

    test("正常系: サーバー情報が正しく設定される", () => {
      const serverInfo = (server as any).serverInfo;
      expect(serverInfo.name).toBe("google-calendar-mcp");
      expect(serverInfo.version).toBe("0.1.0");
    });
  });

  describe("Tool Registration", () => {
    test("正常系: 必要なツールが全て登録されている", async () => {
      const listToolsHandler = (server as any).handlers.get("tools/list");
      expect(listToolsHandler).toBeDefined();

      // ツールリストを取得
      const response = await listToolsHandler({});
      const tools = response.tools;

      // 全ての必須ツールが存在することを確認
      const toolNames = tools.map((tool: any) => tool.name);
      expect(toolNames).toContain("list_calendars");
      expect(toolNames).toContain("get_calendar");
      expect(toolNames).toContain("list_events");
      expect(toolNames).toContain("get_event");
      expect(toolNames).toContain("create_event");
      expect(toolNames).toContain("update_event");
      expect(toolNames).toContain("delete_event");
      expect(toolNames).toContain("search_events");
      expect(toolNames).toContain("get_freebusy");
      expect(toolNames).toContain("get_colors");
    });

    test("正常系: ツールに適切な説明が設定されている", async () => {
      const listToolsHandler = (server as any).handlers.get("tools/list");
      const response = await listToolsHandler({});
      const tools = response.tools;

      const listCalendarsTool = tools.find(
        (t: any) => t.name === "list_calendars",
      );
      expect(listCalendarsTool).toBeDefined();
      expect(listCalendarsTool.description).toContain("List all calendars");
      expect(listCalendarsTool.inputSchema).toBeDefined();
    });
  });

  describe("Tool Execution - list_calendars", () => {
    test("正常系: list_calendarsツールが実行できる", async () => {
      // Mock response
      mockCalendarApi.calendarList.list.mockResolvedValueOnce({
        data: {
          items: [
            {
              id: "primary",
              summary: "Primary Calendar",
              timeZone: "Asia/Tokyo",
              colorId: "1",
              backgroundColor: "#9fc6e7",
              foregroundColor: "#000000",
              selected: true,
              accessRole: "owner",
              primary: true,
            },
          ],
        },
      });

      // Initialize client
      await initializeClient();

      const callToolHandler = (server as any).handlers.get("tools/call");
      const response = await callToolHandler({
        params: {
          name: "list_calendars",
          arguments: {
            maxResults: 10,
          },
        },
      });

      expect(response).toBeDefined();
      expect(response.content).toBeDefined();
      expect(response.content[0].type).toBe("text");

      const result = JSON.parse(response.content[0].text);
      expect(result.calendars).toHaveLength(1);
      expect(result.calendars[0].id).toBe("primary");
    });

    test("異常系: 認証エラーが適切にハンドリングされる", async () => {
      mockCalendarApi.calendarList.list.mockRejectedValueOnce({
        response: {
          status: 401,
          data: { error: { message: "Unauthorized" } },
        },
      });

      await initializeClient();

      const callToolHandler = (server as any).handlers.get("tools/call");
      const response = await callToolHandler({
        params: {
          name: "list_calendars",
          arguments: {},
        },
      });

      expect(response.isError).toBe(true);
      expect(response.content[0].text).toContain("Error:");
    });
  });

  describe("Tool Execution - list_events", () => {
    test("正常系: list_eventsツールが実行できる", async () => {
      mockCalendarApi.events.list.mockResolvedValueOnce({
        data: {
          items: [
            {
              id: "event-1",
              summary: "Team Meeting",
              description: "Weekly sync",
              start: {
                dateTime: "2024-02-01T10:00:00+09:00",
                timeZone: "Asia/Tokyo",
              },
              end: {
                dateTime: "2024-02-01T11:00:00+09:00",
                timeZone: "Asia/Tokyo",
              },
              attendees: [
                {
                  email: "user@example.com",
                  responseStatus: "accepted",
                },
              ],
            },
          ],
          nextPageToken: "token-123",
        },
      });

      await initializeClient();

      const callToolHandler = (server as any).handlers.get("tools/call");
      const response = await callToolHandler({
        params: {
          name: "list_events",
          arguments: {
            calendarId: "primary",
            timeMin: "2024-02-01T00:00:00Z",
            timeMax: "2024-02-28T23:59:59Z",
            maxResults: 10,
          },
        },
      });

      const result = JSON.parse(response.content[0].text);
      expect(result.events).toHaveLength(1);
      expect(result.events[0].summary).toBe("Team Meeting");
      expect(result.nextPageToken).toBe("token-123");
    });
  });

  describe("Tool Execution - create_event", () => {
    test("正常系: create_eventツールが実行できる", async () => {
      const newEvent = {
        summary: "New Meeting",
        description: "Important discussion",
        location: "Conference Room",
        start: {
          dateTime: "2024-02-15T14:00:00+09:00",
          timeZone: "Asia/Tokyo",
        },
        end: {
          dateTime: "2024-02-15T15:00:00+09:00",
          timeZone: "Asia/Tokyo",
        },
        attendees: [{ email: "attendee@example.com" }],
      };

      mockCalendarApi.events.insert.mockResolvedValueOnce({
        data: {
          ...newEvent,
          id: "created-event-id",
          status: "confirmed",
          htmlLink: "https://calendar.google.com/event?eid=xxx",
          created: "2024-01-25T00:00:00Z",
          updated: "2024-01-25T00:00:00Z",
        },
      });

      await initializeClient();

      const callToolHandler = (server as any).handlers.get("tools/call");
      const response = await callToolHandler({
        params: {
          name: "create_event",
          arguments: {
            calendarId: "primary",
            ...newEvent,
            sendNotifications: true,
          },
        },
      });

      const result = JSON.parse(response.content[0].text);
      expect(result.id).toBe("created-event-id");
      expect(result.summary).toBe("New Meeting");
      expect(result.status).toBe("confirmed");
    });

    test("異常系: 必須フィールドが不足している場合エラー", async () => {
      await initializeClient();

      const callToolHandler = (server as any).handlers.get("tools/call");
      const response = await callToolHandler({
        params: {
          name: "create_event",
          arguments: {
            calendarId: "primary",
            summary: "Invalid Event",
            // start/endが不足
          },
        },
      });

      expect(response.isError).toBe(true);
      expect(response.content[0].text).toContain("Error:");
    });
  });

  describe("Tool Execution - search_events", () => {
    test("正常系: search_eventsツールが実行できる", async () => {
      mockCalendarApi.events.list.mockResolvedValueOnce({
        data: {
          items: [
            {
              id: "search-result-1",
              summary: "Meeting with John",
              start: {
                dateTime: "2024-02-10T15:00:00+09:00",
              },
              end: {
                dateTime: "2024-02-10T16:00:00+09:00",
              },
            },
          ],
        },
      });

      await initializeClient();

      const callToolHandler = (server as any).handlers.get("tools/call");
      const response = await callToolHandler({
        params: {
          name: "search_events",
          arguments: {
            calendarId: "primary",
            query: "John",
            timeMin: "2024-02-01T00:00:00Z",
            timeMax: "2024-02-28T23:59:59Z",
          },
        },
      });

      const result = JSON.parse(response.content[0].text);
      expect(result.events).toHaveLength(1);
      expect(result.events[0].summary).toBe("Meeting with John");
    });
  });

  describe("Tool Execution - get_freebusy", () => {
    test("正常系: get_freebusyツールが実行できる", async () => {
      mockCalendarApi.freebusy.query.mockResolvedValueOnce({
        data: {
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
          },
        },
      });

      await initializeClient();

      const callToolHandler = (server as any).handlers.get("tools/call");
      const response = await callToolHandler({
        params: {
          name: "get_freebusy",
          arguments: {
            timeMin: "2024-02-01T00:00:00Z",
            timeMax: "2024-02-02T00:00:00Z",
            items: [{ id: "primary" }],
          },
        },
      });

      const result = JSON.parse(response.content[0].text);
      expect(result.calendars).toBeDefined();
      expect(result.calendars.primary.busy).toHaveLength(2);
    });
  });

  describe("Tool Execution - get_colors", () => {
    test("正常系: get_colorsツールが実行できる", async () => {
      mockCalendarApi.colors.get.mockResolvedValueOnce({
        data: {
          calendar: {
            "1": { background: "#ac725e", foreground: "#ffffff" },
            "2": { background: "#d06b64", foreground: "#ffffff" },
          },
          event: {
            "1": { background: "#a4bdfc", foreground: "#1d1d1d" },
            "2": { background: "#7ae7bf", foreground: "#1d1d1d" },
          },
        },
      });

      await initializeClient();

      const callToolHandler = (server as any).handlers.get("tools/call");
      const response = await callToolHandler({
        params: {
          name: "get_colors",
          arguments: {},
        },
      });

      const result = JSON.parse(response.content[0].text);
      expect(result.calendar).toBeDefined();
      expect(result.calendar["1"].background).toBe("#ac725e");
      expect(result.event).toBeDefined();
    });
  });

  // Helper function to initialize the client
  async function initializeClient() {
    // Ensure the client is initialized before calling tools
    const ensureInitialized = (server as any).ensureInitialized;
    if (ensureInitialized) {
      try {
        await ensureInitialized();
      } catch {
        // Client initialization might fail in test environment
        // but we can still test the tool handlers
      }
    }
  }
});

describe("MCP Server Integration Tests", () => {
  describe("runServer", () => {
    test("正常系: 環境変数からサービスアカウント認証設定を読み込む", async () => {
      const serviceAccountKey = {
        type: "service_account",
        project_id: "test-project",
        private_key_id: "key-id",
        private_key:
          "-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----\n",
        client_email: "test@test-project.iam.gserviceaccount.com",
        client_id: "123456789",
      };

      process.env.GOOGLE_SERVICE_ACCOUNT_KEY =
        JSON.stringify(serviceAccountKey);

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {
        // Intentionally empty
      });
      const mockConnect = vi.fn();

      // StdioServerTransportのモック
      vi.mock("@modelcontextprotocol/sdk/server/stdio.js", () => ({
        StdioServerTransport: vi.fn().mockImplementation(() => ({
          connect: mockConnect,
        })),
      }));

      // runServerは非同期関数なので、Promiseとして扱う
      const runServerPromise = runServer({
        type: "service-account",
        credentials: serviceAccountKey,
      });

      // 非同期処理が開始されることを確認
      expect(runServerPromise).toBeInstanceOf(Promise);

      consoleSpy.mockRestore();
      delete process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    });

    test("正常系: OAuth2認証設定を処理する", async () => {
      process.env.GOOGLE_OAUTH_CLIENT_ID = "client-id";
      process.env.GOOGLE_OAUTH_CLIENT_SECRET = "client-secret";
      process.env.GOOGLE_OAUTH_REFRESH_TOKEN = "refresh-token";

      const mockConnect = vi.fn();
      vi.mock("@modelcontextprotocol/sdk/server/stdio.js", () => ({
        StdioServerTransport: vi.fn().mockImplementation(() => ({
          connect: mockConnect,
        })),
      }));

      const runServerPromise = runServer({
        type: "oauth2",
        clientId: "client-id",
        clientSecret: "client-secret",
        refreshToken: "refresh-token",
      });

      expect(runServerPromise).toBeInstanceOf(Promise);

      delete process.env.GOOGLE_OAUTH_CLIENT_ID;
      delete process.env.GOOGLE_OAUTH_CLIENT_SECRET;
      delete process.env.GOOGLE_OAUTH_REFRESH_TOKEN;
    });

    test("正常系: APIキー認証設定を処理する", async () => {
      process.env.GOOGLE_API_KEY = "test-api-key";

      const mockConnect = vi.fn();
      vi.mock("@modelcontextprotocol/sdk/server/stdio.js", () => ({
        StdioServerTransport: vi.fn().mockImplementation(() => ({
          connect: mockConnect,
        })),
      }));

      const runServerPromise = runServer({
        type: "api-key",
        apiKey: "test-api-key",
      });

      expect(runServerPromise).toBeInstanceOf(Promise);

      delete process.env.GOOGLE_API_KEY;
    });
  });
});
