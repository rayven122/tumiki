import type { Response } from "express";
import { vi, beforeEach, test, expect } from "vitest";
import { handlePOSTRequest } from "../post.js";
import type { AuthenticatedRequest } from "../../../middleware/integratedAuth.js";

// Mock modules
vi.mock("@modelcontextprotocol/sdk/types.js", () => ({
  isInitializeRequest: vi.fn(),
}));

vi.mock("../../../utils/transport.js", () => ({
  getStreamableTransportBySessionId: vi.fn(),
  createStreamableTransport: vi.fn(),
}));

vi.mock("../../../utils/session.js", () => ({
  isSessionValid: vi.fn(),
  canCreateNewSession: vi.fn(),
  updateSessionActivity: vi.fn(),
}));

vi.mock("../../../utils/proxy.js", () => ({
  getServer: vi.fn(),
}));

vi.mock("../../../utils/mcpAdapter.js", () => ({
  toMcpRequest: vi.fn(),
  ensureMcpAcceptHeader: vi.fn(),
}));

vi.mock("../../../libs/requestLogger.js", () => ({
  logMcpRequest: vi.fn(),
}));

// Mock imports
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import {
  getStreamableTransportBySessionId,
  createStreamableTransport,
} from "../../../utils/transport.js";
import {
  isSessionValid,
  canCreateNewSession,
  updateSessionActivity,
} from "../../../utils/session.js";
import { getServer } from "../../../utils/proxy.js";
import {
  toMcpRequest,
  ensureMcpAcceptHeader,
} from "../../../utils/mcpAdapter.js";

describe("handlePOSTRequest", () => {
  let mockReq: Partial<AuthenticatedRequest>;
  let mockRes: Partial<Response>;
  let mockTransport: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockTransport = {
      handleRequest: vi.fn().mockResolvedValue(undefined),
    };

    mockReq = {
      headers: {},
      body: {},
      method: "POST",
      authInfo: {
        type: "api_key" as const,
        userMcpServerInstanceId: "test-instance-id",
        organizationId: "test-org-id",
      },
    };

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      headersSent: false,
    };

    vi.mocked(getServer).mockResolvedValue({
      server: {
        connect: vi.fn().mockResolvedValue(undefined),
      },
    } as any);
  });

  test("新しいセッションではinitializeリクエストが必要", async () => {
    // Arrange
    vi.mocked(isInitializeRequest).mockReturnValue(false);
    vi.mocked(canCreateNewSession).mockReturnValue(true);

    // Act
    await handlePOSTRequest(
      mockReq as any,
      mockRes as any,
      undefined,
      "test-client",
    );

    // Assert
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      jsonrpc: "2.0",
      error: {
        code: -32600,
        message: "New session requires initialize request",
      },
      id: null,
    });
  });

  test("新しいセッションでinitializeリクエストが送信されると正常に処理される", async () => {
    // Arrange
    vi.mocked(isInitializeRequest).mockReturnValue(true);
    vi.mocked(canCreateNewSession).mockReturnValue(true);
    vi.mocked(createStreamableTransport).mockReturnValue(mockTransport);
    vi.mocked(toMcpRequest).mockReturnValue({} as any);

    // Act
    await handlePOSTRequest(
      mockReq as any,
      mockRes as any,
      undefined,
      "test-client",
    );

    // Assert
    expect(createStreamableTransport).toHaveBeenCalledWith(
      mockReq.authInfo,
      "test-client",
    );
    expect(mockTransport.handleRequest).toHaveBeenCalled();
  });

  test("既存セッションでinitializeリクエストを送信すると拒否される", async () => {
    // Arrange
    vi.mocked(isInitializeRequest).mockReturnValue(true);
    vi.mocked(isSessionValid).mockReturnValue(true);

    // Act
    await handlePOSTRequest(
      mockReq as any,
      mockRes as any,
      "existing-session-id",
      "test-client",
    );

    // Assert
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      jsonrpc: "2.0",
      error: {
        code: -32600,
        message: "Initialize request cannot be sent to existing session",
      },
      id: null,
    });
  });

  test("既存セッションで通常のリクエストが正常に処理される", async () => {
    // Arrange
    const sessionId = "existing-session-id";
    vi.mocked(isInitializeRequest).mockReturnValue(false);
    vi.mocked(isSessionValid).mockReturnValue(true);
    vi.mocked(getStreamableTransportBySessionId).mockReturnValue(mockTransport);
    vi.mocked(toMcpRequest).mockReturnValue({} as any);

    // Act
    await handlePOSTRequest(
      mockReq as any,
      mockRes as any,
      sessionId,
      "test-client",
    );

    // Assert
    expect(getStreamableTransportBySessionId).toHaveBeenCalledWith(sessionId);
    expect(updateSessionActivity).toHaveBeenCalledWith(
      sessionId,
      "test-client",
    );
    expect(mockTransport.handleRequest).toHaveBeenCalled();
  });

  test("無効なセッションIDでエラーが返される", async () => {
    // Arrange
    vi.mocked(isInitializeRequest).mockReturnValue(false);
    vi.mocked(isSessionValid).mockReturnValue(false);

    // Act
    await handlePOSTRequest(
      mockReq as any,
      mockRes as any,
      "invalid-session",
      "test-client",
    );

    // Assert
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      jsonrpc: "2.0",
      error: {
        code: -32600,
        message: "Invalid or expired session",
      },
      id: null,
    });
  });

  test("存在しないセッションIDでエラーが返される", async () => {
    // Arrange
    vi.mocked(isInitializeRequest).mockReturnValue(false);
    vi.mocked(isSessionValid).mockReturnValue(true);
    vi.mocked(getStreamableTransportBySessionId).mockReturnValue(undefined);

    // Act
    await handlePOSTRequest(
      mockReq as any,
      mockRes as any,
      "nonexistent-session",
      "test-client",
    );

    // Assert
    expect(mockRes.status).toHaveBeenCalledWith(404);
    expect(mockRes.json).toHaveBeenCalledWith({
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message: "Session not found",
      },
      id: null,
    });
  });

  test("サーバーが満杯の場合にエラーが返される", async () => {
    // Arrange
    vi.mocked(isInitializeRequest).mockReturnValue(true);
    vi.mocked(canCreateNewSession).mockReturnValue(false);

    // Act
    await handlePOSTRequest(
      mockReq as any,
      mockRes as any,
      undefined,
      "test-client",
    );

    // Assert
    expect(mockRes.status).toHaveBeenCalledWith(503);
    expect(mockRes.json).toHaveBeenCalledWith({
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message: "Server at capacity",
      },
      id: null,
    });
  });

  test("認証情報が不足している場合にエラーが返される", async () => {
    // Arrange
    vi.mocked(isInitializeRequest).mockReturnValue(true);
    vi.mocked(canCreateNewSession).mockReturnValue(true);
    mockReq.authInfo = undefined;

    // Act
    await handlePOSTRequest(
      mockReq as any,
      mockRes as any,
      undefined,
      "test-client",
    );

    // Assert
    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message: "Authentication required",
      },
      id: null,
    });
  });
});
