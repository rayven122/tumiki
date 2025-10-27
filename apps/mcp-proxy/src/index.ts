#!/usr/bin/env node
import { Hono } from "hono";
import { cors } from "hono/cors";
import { authMiddleware } from "./middleware/auth.js";
import { ToolRouter } from "./services/toolRouter.js";
import { logInfo, logError } from "./utils/logger.js";
import type { HonoEnv } from "./types/hono.js";

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
      return c.json({
        jsonrpc: "2.0",
        id: request.id ?? null,
        error: {
          code: -32600,
          message: "Invalid Request: jsonrpc must be 2.0",
        },
      });
    }

    if (!request.method) {
      return c.json({
        jsonrpc: "2.0",
        id: request.id ?? null,
        error: {
          code: -32600,
          message: "Invalid Request: method is required",
        },
      });
    }

    // tools/list, tools/call の実装
    switch (request.method) {
      case "tools/list": {
        try {
          const tools = await toolRouter.getAllTools();

          return c.json({
            jsonrpc: "2.0",
            id: request.id ?? null,
            result: {
              tools: tools.map((tool) => ({
                name: tool.name,
                description: tool.description,
                inputSchema: tool.inputSchema,
              })),
            },
          });
        } catch (error) {
          logError("Failed to list tools", error as Error, {
            organizationId: authInfo.organizationId,
          });

          return c.json({
            jsonrpc: "2.0",
            id: request.id ?? null,
            error: {
              code: -32603,
              message: "Failed to list tools",
              data: {
                message:
                  error instanceof Error ? error.message : "Unknown error",
              },
            },
          });
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
          return c.json({
            jsonrpc: "2.0",
            id: request.id ?? null,
            error: {
              code: -32602,
              message: "Invalid params: name is required",
            },
          });
        }

        try {
          const result = await toolRouter.callTool(
            params.name,
            params.arguments ?? {},
          );

          return c.json({
            jsonrpc: "2.0",
            id: request.id ?? null,
            result: {
              content: result.content,
            },
          });
        } catch (error) {
          logError("Failed to call tool", error as Error, {
            organizationId: authInfo.organizationId,
            toolName: params.name,
          });

          return c.json({
            jsonrpc: "2.0",
            id: request.id ?? null,
            error: {
              code: -32603,
              message: "Tool execution failed",
              data: {
                message:
                  error instanceof Error ? error.message : "Unknown error",
              },
            },
          });
        }
      }

      default: {
        return c.json({
          jsonrpc: "2.0",
          id: request.id ?? null,
          error: {
            code: -32601,
            message: `Method not found: ${request.method}`,
          },
        });
      }
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    logError("Failed to handle request", error as Error, {
      organizationId: authInfo.organizationId,
    });

    return c.json({
      jsonrpc: "2.0",
      id: null,
      error: {
        code: -32603,
        message: "Internal error",
        data: {
          message: errorMessage,
        },
      },
    });
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
const port = Number(process.env.PORT) || 8080;

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
