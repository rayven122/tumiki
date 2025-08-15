import express, { type Express } from "express";
import type { Request, Response, NextFunction } from "express";
import { handleHealthCheck } from "../../routes/health/index.js";
import { handleMCPRequest } from "../../routes/mcp/index.js";
import {
  establishSSEConnection,
  handleSSEMessage,
} from "../../utils/transport.js";
import type { AuthenticatedRequest } from "../../middleware/integratedAuth.js";
import type { AuthInfo } from "../../utils/session.js";

export const createTestApp = (
  mockAuthMiddleware?: (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) => void,
): Express => {
  const app = express();

  app.use(express.json({ limit: "10mb" }));

  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
    res.header(
      "Access-Control-Allow-Headers",
      "Content-Type, mcp-session-id, api-key, x-api-key, x-client-id, Authorization",
    );

    if (req.method === "OPTIONS") {
      res.sendStatus(200);
      return;
    }
    next();
  });

  app.get("/health", handleHealthCheck);

  if (mockAuthMiddleware) {
    app.use(mockAuthMiddleware);
  } else {
    app.use((req: Request, _res: Response, next: NextFunction) => {
      (req as AuthenticatedRequest).authInfo = {
        type: "api_key",
        userMcpServerInstanceId: "mcpserver-test-123",
        organizationId: "org_test_123",
      };
      next();
    });
  }

  app.all("/mcp/:userMcpServerInstanceId", handleMCPRequest);
  app.all("/mcp", handleMCPRequest);

  app.get("/sse/:userMcpServerInstanceId", establishSSEConnection);
  app.post("/messages/:userMcpServerInstanceId", handleSSEMessage);

  app.get("/sse", establishSSEConnection);
  app.post("/messages", handleSSEMessage);

  return app;
};

export const createMockAuthMiddleware = (authInfo: AuthInfo | null) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (authInfo) {
      req.authInfo = authInfo;
      next();
    } else {
      res.status(401).json({
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: "Unauthorized: Authentication required",
        },
        id: null,
      });
    }
  };
};

export const waitForCondition = async (
  condition: () => boolean,
  timeout = 5000,
  interval = 100,
): Promise<void> => {
  const startTime = Date.now();

  while (!condition()) {
    if (Date.now() - startTime > timeout) {
      throw new Error("Timeout waiting for condition");
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
};

export const parseSSEData = (data: string): unknown[] => {
  const lines = data.split("\n");
  const messages: unknown[] = [];

  for (const line of lines) {
    if (line.startsWith("data: ")) {
      try {
        const jsonData = JSON.parse(line.slice(6)) as unknown;
        messages.push(jsonData);
      } catch {
        // Skip non-JSON data
      }
    }
  }

  return messages;
};
