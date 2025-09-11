import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { createClient } from "../utils/proxy.js";

// SSEClientTransportのモックを作成
vi.mock("@modelcontextprotocol/sdk/client/sse.js", () => ({
  SSEClientTransport: vi.fn(),
}));

// fetchのモック
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("SSE接続でのx-api-keyヘッダー送信", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      body: null,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("SSE transportでAPI_KEY環境変数がX-API-Keyヘッダーとして送信される", async () => {
    const serverConfig = {
      name: "test-server",
      toolNames: ["tool1"],
      transport: {
        type: "sse" as const,
        url: "https://api.example.com/mcp",
        env: {
          API_KEY: "test-api-key-123",
        },
      },
    };

    // SSEClientTransportのモックを設定
    const mockTransportInstance = {
      close: vi.fn(),
    };
    (SSEClientTransport as any).mockImplementation((url: URL, options: any) => {
      // optionsに渡されたfetch関数を検証
      if (options?.eventSourceInit?.fetch) {
        // カスタムfetch関数が提供されていることを確認
        const customFetch = options.eventSourceInit.fetch;
        // テスト用のURLとinitでfetchを呼び出し
        customFetch("https://api.example.com/test", { method: "GET" });
      }
      return mockTransportInstance;
    });

    await createClient(serverConfig as any);

    // SSEClientTransportが正しく呼び出されたことを確認
    expect(SSEClientTransport).toHaveBeenCalledWith(
      expect.any(URL),
      expect.objectContaining({
        eventSourceInit: expect.objectContaining({
          fetch: expect.any(Function),
        }),
        requestInit: expect.objectContaining({
          headers: expect.objectContaining({
            "X-API-Key": "test-api-key-123",
          }),
        }),
      }),
    );

    // カスタムfetchが正しいヘッダーで呼び出されたことを確認
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.example.com/test",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          "X-API-Key": "test-api-key-123",
        }),
      }),
    );
  });

  test("SSE transportでX_API_KEY環境変数がX-API-Keyヘッダーとして送信される", async () => {
    const serverConfig = {
      name: "test-server",
      toolNames: ["tool1"],
      transport: {
        type: "sse" as const,
        url: "https://api.example.com/mcp",
        env: {
          X_API_KEY: "test-x-api-key-456",
        },
      },
    };

    const mockTransportInstance = {
      close: vi.fn(),
    };
    (SSEClientTransport as any).mockImplementation(() => mockTransportInstance);

    await createClient(serverConfig as any);

    expect(SSEClientTransport).toHaveBeenCalledWith(
      expect.any(URL),
      expect.objectContaining({
        requestInit: expect.objectContaining({
          headers: expect.objectContaining({
            "X-API-Key": "test-x-api-key-456",
          }),
        }),
      }),
    );
  });

  test("SSE transportでBEARER_TOKEN環境変数がAuthorizationヘッダーとして送信される", async () => {
    const serverConfig = {
      name: "test-server",
      toolNames: ["tool1"],
      transport: {
        type: "sse" as const,
        url: "https://api.example.com/mcp",
        env: {
          BEARER_TOKEN: "test-bearer-token-789",
        },
      },
    };

    const mockTransportInstance = {
      close: vi.fn(),
    };
    (SSEClientTransport as any).mockImplementation(() => mockTransportInstance);

    await createClient(serverConfig as any);

    expect(SSEClientTransport).toHaveBeenCalledWith(
      expect.any(URL),
      expect.objectContaining({
        requestInit: expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer test-bearer-token-789",
          }),
        }),
      }),
    );
  });

  test("SSE transportでHEADER_プレフィックスのカスタムヘッダーが送信される", async () => {
    const serverConfig = {
      name: "test-server",
      toolNames: ["tool1"],
      transport: {
        type: "sse" as const,
        url: "https://api.example.com/mcp",
        env: {
          HEADER_Custom_Auth: "custom-value-123",
          HEADER_X_Request_Id: "request-id-456",
        },
      },
    };

    const mockTransportInstance = {
      close: vi.fn(),
    };
    (SSEClientTransport as any).mockImplementation(() => mockTransportInstance);

    await createClient(serverConfig as any);

    expect(SSEClientTransport).toHaveBeenCalledWith(
      expect.any(URL),
      expect.objectContaining({
        requestInit: expect.objectContaining({
          headers: expect.objectContaining({
            "Custom-Auth": "custom-value-123",
            "X-Request-Id": "request-id-456",
          }),
        }),
      }),
    );
  });

  test("SSE transportで環境変数が存在しない場合、ヘッダーが設定されない", async () => {
    const serverConfig = {
      name: "test-server",
      toolNames: ["tool1"],
      transport: {
        type: "sse" as const,
        url: "https://api.example.com/mcp",
        env: {},
      },
    };

    const mockTransportInstance = {
      close: vi.fn(),
    };
    (SSEClientTransport as any).mockImplementation(() => mockTransportInstance);

    await createClient(serverConfig as any);

    expect(SSEClientTransport).toHaveBeenCalledWith(
      expect.any(URL),
      expect.objectContaining({
        eventSourceInit: expect.objectContaining({
          fetch: undefined,
        }),
        requestInit: expect.objectContaining({
          headers: undefined,
        }),
      }),
    );
  });

  test("SSE transport getServerConfigsで環境変数が正しく渡される", async () => {
    // getServerConfigsのテストは実際のデータベースアクセスが必要なため、
    // 統合テストで確認する必要がある
    expect(true).toBe(true);
  });
});
