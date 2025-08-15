import { describe, test, expect, vi } from "vitest";
import type { Response } from "express";
import {
  sendAuthenticationError,
  sendBadRequestError,
  sendNotFoundError,
  sendMethodNotAllowedError,
  sendServiceUnavailableError,
  sendJsonRpcError,
  JSON_RPC_ERROR_CODES,
} from "../../utils/errorResponse.js";

describe("エラーレスポンスユーティリティ", () => {
  const createMockResponse = () => {
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      headersSent: false,
    } as unknown as Response;
    return res;
  };

  test("sendAuthenticationError - 401エラーを返す", () => {
    const res = createMockResponse();
    sendAuthenticationError(res, "Custom auth error");

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(res.status).toHaveBeenCalledWith(401);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(res.json).toHaveBeenCalledWith({
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message: "Custom auth error",
      },
      id: null,
    });
  });

  test("sendBadRequestError - 400エラーを返す", () => {
    const res = createMockResponse();
    sendBadRequestError(res, "Bad request");

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(res.status).toHaveBeenCalledWith(400);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(res.json).toHaveBeenCalledWith({
      jsonrpc: "2.0",
      error: {
        code: -32600,
        message: "Bad request",
      },
      id: null,
    });
  });

  test("sendNotFoundError - 404エラーを返す", () => {
    const res = createMockResponse();
    sendNotFoundError(res, "Not found");

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(res.status).toHaveBeenCalledWith(404);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(res.json).toHaveBeenCalledWith({
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message: "Not found",
      },
      id: null,
    });
  });

  test("sendMethodNotAllowedError - 405エラーを返す", () => {
    const res = createMockResponse();
    sendMethodNotAllowedError(res, "POST");

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(res.status).toHaveBeenCalledWith(405);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(res.json).toHaveBeenCalledWith({
      jsonrpc: "2.0",
      error: {
        code: -32601,
        message: "Method POST not allowed",
      },
      id: null,
    });
  });

  test("sendServiceUnavailableError - 503エラーを返す", () => {
    const res = createMockResponse();
    sendServiceUnavailableError(res, "Service unavailable");

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(res.status).toHaveBeenCalledWith(503);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(res.json).toHaveBeenCalledWith({
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message: "Service unavailable",
      },
      id: null,
    });
  });

  test("sendJsonRpcError - カスタムエラーを返す", () => {
    const res = createMockResponse();
    sendJsonRpcError(
      res,
      500,
      "Internal error",
      JSON_RPC_ERROR_CODES.INTERNAL_ERROR,
      "id-123",
    );

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(res.status).toHaveBeenCalledWith(500);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(res.json).toHaveBeenCalledWith({
      jsonrpc: "2.0",
      error: {
        code: -32603,
        message: "Internal error",
      },
      id: "id-123",
    });
  });

  test("headersSentの場合は何もしない", () => {
    const res = createMockResponse();
    (res as { headersSent: boolean }).headersSent = true;

    sendAuthenticationError(res);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(res.status).not.toHaveBeenCalled();
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(res.json).not.toHaveBeenCalled();
  });
});
