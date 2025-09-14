import { vi, beforeEach, test, expect } from "vitest";
import { createStreamableTransport } from "../transport.js";

// Mock the StreamableHTTPServerTransport
vi.mock("@modelcontextprotocol/sdk/server/streamableHttp.js", () => ({
  StreamableHTTPServerTransport: vi.fn().mockImplementation((config) => {
    return {
      config,
      sessionId: "mock-session-id",
    };
  }),
}));

vi.mock("../session.js", () => ({
  generateSessionId: vi.fn().mockReturnValue("test-session-id"),
  createSessionWithId: vi.fn(),
  TransportType: {
    STREAMABLE_HTTP: "streamable_http",
  },
}));

import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { AuthInfo } from "../session.js";

describe("createStreamableTransport", () => {
  let mockAuthInfo: AuthInfo;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthInfo = {
      type: "api_key" as const,
      userMcpServerInstanceId: "test-instance-id",
      organizationId: "test-org-id",
    };
  });

  test("DNS Rebinding Protectionが有効化されることを確認", () => {
    // Act
    createStreamableTransport(mockAuthInfo, "test-client");

    // Assert
    expect(StreamableHTTPServerTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        enableDnsRebindingProtection: true,
        allowedHosts: expect.arrayContaining(["localhost", "127.0.0.1", "::1"]),
      }),
    );
  });

  test("環境変数ALLOWED_HOSTが設定されている場合は許可ホストに追加される", () => {
    // Arrange
    const originalAllowedHost = process.env.ALLOWED_HOST;
    process.env.ALLOWED_HOST = "example.com";

    // Act
    createStreamableTransport(mockAuthInfo, "test-client");

    // Assert
    expect(StreamableHTTPServerTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        allowedHosts: expect.arrayContaining([
          "localhost",
          "127.0.0.1",
          "::1",
          "example.com",
        ]),
      }),
    );

    // Cleanup
    process.env.ALLOWED_HOST = originalAllowedHost;
  });

  test("sessionIdGeneratorが正しく設定される", () => {
    // Act
    createStreamableTransport(mockAuthInfo, "test-client");

    // Assert
    expect(StreamableHTTPServerTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionIdGenerator: expect.any(Function),
      }),
    );
  });

  test("onsessioninitializedコールバックが設定される", () => {
    // Act
    createStreamableTransport(mockAuthInfo, "test-client");

    // Assert
    expect(StreamableHTTPServerTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        onsessioninitialized: expect.any(Function),
      }),
    );
  });
});
