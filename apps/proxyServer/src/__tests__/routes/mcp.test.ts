import { describe, test, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import { handleMCPRequest } from "../../routes/mcp/index.js";
import type { AuthenticatedRequest } from "../../middleware/integratedAuth.js";

// Create a simple test app
const createTestApp = () => {
  const app = express();
  app.use(express.json());

  // Simple auth middleware for testing
  app.use((req, _res, next) => {
    const authReq = req as AuthenticatedRequest;
    // Set auth info if API key is provided
    if (req.headers["x-api-key"]) {
      authReq.authInfo = {
        type: "api_key",
        userMcpServerInstanceId: "test-server-123",
        organizationId: "org-123",
      };
    }
    next();
  });

  app.all("/mcp/:userMcpServerInstanceId", handleMCPRequest);
  app.all("/mcp", handleMCPRequest);

  return app;
};

// Mock the sub-handlers
vi.mock("../../routes/mcp/post.js", () => ({
  handlePOSTRequest: vi.fn(async (_req, res) => {
    res.json({ jsonrpc: "2.0", result: { success: true }, id: 1 });
  }),
}));

vi.mock("../../routes/mcp/get.js", () => ({
  handleGETRequest: vi.fn(async (_req, res) => {
    res.json({ jsonrpc: "2.0", result: { stream: true }, id: 2 });
  }),
}));

vi.mock("../../routes/mcp/delete.js", () => ({
  handleDELETERequest: vi.fn(async (_req, res) => {
    res.json({ jsonrpc: "2.0", result: { deleted: true }, id: 3 });
  }),
}));

describe("MCP エンドポイント", () => {
  let app: express.Application;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createTestApp();
  });

  describe("handleMCPRequest", () => {
    test("認証なしで401エラー", async () => {
      const response = await request(app)
        .post("/mcp/server-123")
        .send({ jsonrpc: "2.0", method: "test", id: 1 });

      expect(response.status).toBe(401);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.message).toContain("Authentication required");
    });

    test("POSTリクエストの処理", async () => {
      const response = await request(app)
        .post("/mcp/server-123")
        .set("X-API-Key", "test-key")
        .send({ jsonrpc: "2.0", method: "test", id: 1 });

      expect(response.status).toBe(200);
      expect(response.body.result).toEqual({ success: true });
    });

    test("GETリクエストの処理", async () => {
      const response = await request(app)
        .get("/mcp/server-123")
        .set("X-API-Key", "test-key")
        .set("mcp-session-id", "session-123");

      expect(response.status).toBe(200);
      expect(response.body.result).toEqual({ stream: true });
    });

    test("DELETEリクエストの処理", async () => {
      const response = await request(app)
        .delete("/mcp/server-123")
        .set("X-API-Key", "test-key")
        .set("mcp-session-id", "session-123");

      expect(response.status).toBe(200);
      expect(response.body.result).toEqual({ deleted: true });
    });

    test("PUTメソッドで405エラー", async () => {
      const response = await request(app)
        .put("/mcp/server-123")
        .set("X-API-Key", "test-key")
        .send({});

      expect(response.status).toBe(405);
      expect(response.body.error.message).toContain("Method PUT not allowed");
    });
  });
});
