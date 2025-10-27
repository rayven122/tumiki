#!/usr/bin/env node
import { Hono } from "hono";
import { cors } from "hono/cors";
import { authMiddleware } from "./middleware/auth.js";
import { ToolRouter } from "./libs/mcp/index.js";
import { logInfo, logError } from "./libs/logger/index.js";
import {
  createJsonRpcError,
  createJsonRpcSuccess,
} from "./libs/jsonrpc/index.js";
import type { HonoEnv } from "./types/index.js";
import { DEFAULT_PORT } from "./constants/server.js";

// JSON-RPCリクエストの型定義
type JsonRpcRequest = {
  jsonrpc: string;
  id?: string | number | null;
  method: string;
  params?: unknown;
};

const toolRouter = new ToolRouter();

// Hono アプリケーションの作成
const app = new Hono<HonoEnv>();

// CORS設定
app.use("/*", cors());

// ヘルスチェック（基本）
app.get("/health", (c) => {
  return c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

// MCP エンドポイント（認証必須、ステートレス）
// 注意: MCP SDK の StreamableHTTPServerTransport は Express 専用のため、
// Hono では JSON-RPC を手動処理
app.post("/mcp", authMiddleware, async (c) => {
  const authInfo = c.get("authInfo");

  try {
    const request: JsonRpcRequest = await c.req.json();

    // リクエスト検証
    if (!request.jsonrpc || request.jsonrpc !== "2.0") {
      return c.json(
        createJsonRpcError(
          request.id,
          -32600,
          "Invalid Request: jsonrpc must be 2.0",
        ),
      );
    }

    if (!request.method) {
      return c.json(
        createJsonRpcError(
          request.id,
          -32600,
          "Invalid Request: method is required",
        ),
      );
    }

    // tools/list, tools/call の実装
    switch (request.method) {
      case "tools/list": {
        try {
          const tools = await toolRouter.getAllTools();

          return c.json(
            createJsonRpcSuccess(request.id, {
              tools: tools.map((tool) => ({
                name: tool.name,
                description: tool.description,
                inputSchema: tool.inputSchema,
              })),
            }),
          );
        } catch (error) {
          logError("Failed to list tools", error as Error, {
            organizationId: authInfo.organizationId,
          });

          return c.json(
            createJsonRpcError(request.id, -32603, "Failed to list tools", {
              message: error instanceof Error ? error.message : "Unknown error",
            }),
          );
        }
      }

      case "tools/call": {
        const params = request.params as
          | {
              name: string;
              arguments: Record<string, unknown>;
            }
          | undefined;

        if (!params?.name) {
          return c.json(
            createJsonRpcError(
              request.id,
              -32602,
              "Invalid params: name is required",
            ),
          );
        }

        try {
          const result = await toolRouter.callTool(
            params.name,
            params.arguments ?? {},
          );

          return c.json(
            createJsonRpcSuccess(request.id, {
              content: result.content,
            }),
          );
        } catch (error) {
          logError("Failed to call tool", error as Error, {
            organizationId: authInfo.organizationId,
            toolName: params.name,
          });

          return c.json(
            createJsonRpcError(request.id, -32603, "Tool execution failed", {
              message: error instanceof Error ? error.message : "Unknown error",
            }),
          );
        }
      }

      default: {
        return c.json(
          createJsonRpcError(
            request.id,
            -32601,
            `Method not found: ${request.method}`,
          ),
        );
      }
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    logError("Failed to handle request", error as Error, {
      organizationId: authInfo.organizationId,
    });

    return c.json(
      createJsonRpcError(null, -32603, "Internal error", {
        message: errorMessage,
      }),
    );
  }
});

// Graceful Shutdown
const shutdown = async () => {
  logInfo("Shutting down gracefully...");

  process.exit(0);
};

process.on("SIGTERM", () => void shutdown());
process.on("SIGINT", () => void shutdown());

// サーバー起動
const port = Number(process.env.PORT) || DEFAULT_PORT;

logInfo(`Starting Tumiki MCP Proxy on port ${port}`, {
  nodeEnv: process.env.NODE_ENV,
  mode: "stateless (Hono + MCP SDK)",
});

// Node.js環境用のHTTPサーバー起動
if (process.env.NODE_ENV !== "test") {
  const { serve } = await import("@hono/node-server");
  serve({ fetch: app.fetch, port }, (info) => {
    logInfo(`Server is running on http://localhost:${info.port}`);
  });
}

export default {
  port,
  fetch: app.fetch,
};
