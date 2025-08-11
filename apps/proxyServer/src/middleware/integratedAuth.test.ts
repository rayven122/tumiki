import { describe, test, expect, vi, beforeEach } from "vitest";
import type { Response, NextFunction } from "express";
import { integratedAuthMiddleware } from "./integratedAuth.js";
import type { AuthenticatedRequest } from "./integratedAuth.js";
import { validateApiKey } from "../libs/validateApiKey.js";
import { validateOAuthToken } from "./oauthTokenAuth.js";
import { db } from "@tumiki/db/tcp";

// モックの設定
vi.mock("../libs/validateApiKey.js");
vi.mock("./oauthTokenAuth.js");
vi.mock("@tumiki/db/tcp", () => ({
  db: {
    userMcpServerInstance: {
      findUnique: vi.fn(),
    },
  },
}));
vi.mock("express-oauth2-jwt-bearer", () => ({
  auth: () => vi.fn(),
}));

describe("integratedAuthMiddleware", () => {
  let req: AuthenticatedRequest;
  let res: Response;
  let next: NextFunction;
  let middleware: ReturnType<typeof integratedAuthMiddleware>;

  beforeEach(() => {
    req = {
      headers: {},
      params: {},
      query: {},
      body: {},
    } as AuthenticatedRequest;

    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      setHeader: vi.fn().mockReturnThis(),
      headersSent: false,
    } as unknown as Response;

    next = vi.fn();
    middleware = integratedAuthMiddleware();

    vi.clearAllMocks();
  });

  describe("BOTH認証タイプ", () => {
    beforeEach(() => {
      req.params.userMcpServerInstanceId = "instance-123";
      vi.mocked(db.userMcpServerInstance.findUnique).mockResolvedValue({
        id: "instance-123",
        name: "Test Instance",
        description: "Test",
        serverStatus: "RUNNING",
        serverType: "CUSTOM",
        authType: "BOTH",
        userId: "user-123",
        organizationId: "org-123",
        toolGroupId: "tool-123",
        displayOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        iconPath: null,
      } as any);
    });

    test("APIキーで認証成功", async () => {
      req.headers["x-api-key"] = "test-api-key";
      
      vi.mocked(validateApiKey).mockResolvedValue({
        valid: true,
        apiKey: { userId: "user-123" } as any,
        userMcpServerInstance: { id: "instance-123" } as any,
      });

      await middleware(req, res, next);

      expect(req.authInfo).toStrictEqual({
        type: "api_key",
        userId: "user-123",
        userMcpServerInstanceId: "instance-123",
        organizationId: "org-123",
      });
      expect(next).toHaveBeenCalled();
    });

    test("Tumiki OAuthトークンで認証成功", async () => {
      req.headers.authorization = "Bearer oauth-token-123";
      
      vi.mocked(validateOAuthToken).mockResolvedValue({
        valid: true,
        userId: "user-123",
        clientId: "client-123",
        scope: "openid profile",
      });

      await middleware(req, res, next);

      expect(req.authInfo).toStrictEqual({
        type: "oauth",
        userId: "user-123",
        userMcpServerInstanceId: "instance-123",
        organizationId: "org-123",
        scope: "openid profile",
      });
      expect(next).toHaveBeenCalled();
    });

    test("APIキーもBearerトークンもない場合はエラー", async () => {
      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: "Either API key or OAuth authentication required",
        },
        id: null,
      });
      expect(next).not.toHaveBeenCalled();
    });

    test("無効なAPIキーの場合、OAuth認証を試みる", async () => {
      req.headers["x-api-key"] = "invalid-key";
      req.headers.authorization = "Bearer oauth-token-123";
      
      vi.mocked(validateApiKey).mockResolvedValue({
        valid: false,
        error: "Invalid API key",
      });
      
      vi.mocked(validateOAuthToken).mockResolvedValue({
        valid: true,
        userId: "user-123",
        clientId: "client-123",
        scope: "openid profile",
      });

      await middleware(req, res, next);

      expect(req.authInfo).toStrictEqual({
        type: "oauth",
        userId: "user-123",
        userMcpServerInstanceId: "instance-123",
        organizationId: "org-123",
        scope: "openid profile",
      });
      expect(next).toHaveBeenCalled();
    });
  });

  describe("OAUTH認証タイプ", () => {
    beforeEach(() => {
      req.params.userMcpServerInstanceId = "instance-123";
      vi.mocked(db.userMcpServerInstance.findUnique).mockResolvedValue({
        id: "instance-123",
        name: "Test Instance",
        description: "Test",
        serverStatus: "RUNNING",
        serverType: "CUSTOM",
        authType: "OAUTH",
        userId: "user-123",
        organizationId: "org-123",
        toolGroupId: "tool-123",
        displayOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        iconPath: null,
      } as any);
    });

    test("Tumiki OAuthトークンで認証成功", async () => {
      req.headers.authorization = "Bearer oauth-token-123";
      
      vi.mocked(validateOAuthToken).mockResolvedValue({
        valid: true,
        userId: "user-123",
        clientId: "client-123",
        scope: "openid profile",
      });

      await middleware(req, res, next);

      expect(req.authInfo).toStrictEqual({
        type: "oauth",
        userId: "user-123",
        userMcpServerInstanceId: "instance-123",
        organizationId: "org-123",
        scope: "openid profile",
      });
      expect(next).toHaveBeenCalled();
    });

    test("Bearerトークンがない場合はエラー", async () => {
      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: "OAuth authentication required for this server",
        },
        id: null,
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe("API_KEY認証タイプ", () => {
    beforeEach(() => {
      req.params.userMcpServerInstanceId = "instance-123";
      vi.mocked(db.userMcpServerInstance.findUnique).mockResolvedValue({
        id: "instance-123",
        name: "Test Instance",
        description: "Test",
        serverStatus: "RUNNING",
        serverType: "CUSTOM",
        authType: "API_KEY",
        userId: "user-123",
        organizationId: "org-123",
        toolGroupId: "tool-123",
        displayOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        iconPath: null,
      } as any);
    });

    test("APIキーで認証成功", async () => {
      req.headers["x-api-key"] = "test-api-key";
      
      vi.mocked(validateApiKey).mockResolvedValue({
        valid: true,
        apiKey: { userId: "user-123" } as any,
        userMcpServerInstance: { id: "instance-123" } as any,
      });

      await middleware(req, res, next);

      expect(req.authInfo).toStrictEqual({
        type: "api_key",
        userId: "user-123",
        userMcpServerInstanceId: "instance-123",
        organizationId: "org-123",
      });
      expect(next).toHaveBeenCalled();
    });

    test("APIキーがない場合はエラー", async () => {
      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: "API key authentication required for this server",
        },
        id: null,
      });
      expect(next).not.toHaveBeenCalled();
    });
  });
});