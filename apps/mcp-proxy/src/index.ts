#!/usr/bin/env node
import { Hono } from "hono";
import { cors } from "hono/cors";
import { authMiddleware } from "./middleware/auth.js";
import {
  createApiKeyRateLimiter,
  createOrganizationRateLimiter,
} from "./middleware/rateLimit.js";
import { McpLogger } from "./services/mcpLogger.js";
import { ToolRouter } from "./services/toolRouter.js";
import { remoteMcpPool } from "./services/remoteMcpPool.js";
import type { HonoEnv } from "./types/hono.js";
import { initializeRedis, closeRedis } from "./libs/redis.js";
import { initializeTelemetry, shutdownTelemetry } from "./libs/telemetry.js";

// Phase 2: OpenTelemetryとRedisの初期化
initializeTelemetry();
initializeRedis();

const logger = new McpLogger();
const toolRouter = new ToolRouter();

// Hono アプリケーションの作成
const app = new Hono<HonoEnv>();

// CORS設定
app.use("/*", cors());

// Phase 2: レート制限ミドルウェア（認証前に適用）
const orgRateLimiter = createOrganizationRateLimiter();
const apiKeyRateLimiter = createApiKeyRateLimiter();
app.use("/*", orgRateLimiter);
app.use("/*", apiKeyRateLimiter);

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
    const request = await c.req.json();

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

    // Phase 2 で実装予定: tools/list, tools/call の実装
    // 現在はサンプルレスポンスを返す
    switch (request.method) {
      case "tools/list": {
        // Phase 2: 実際のツールリストを返す
        return c.json({
          jsonrpc: "2.0",
          id: request.id ?? null,
          result: {
            tools: [
              {
                name: "echo",
                description: "Echoes back the provided message",
                inputSchema: {
                  type: "object",
                  properties: {
                    message: { type: "string" },
                  },
                  required: ["message"],
                },
              },
              {
                name: "health",
                description: "Check the health status of the proxy",
                inputSchema: {
                  type: "object",
                  properties: {},
                },
              },
            ],
          },
        });
      }

      case "tools/call": {
        const params = request.params as {
          name: string;
          arguments: Record<string, unknown>;
        };

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

        // Phase 2: 実際のツール実行を実装
        // 現在はサンプルレスポンスを返す
        if (params.name === "echo") {
          const message = params.arguments?.message as string;
          return c.json({
            jsonrpc: "2.0",
            id: request.id ?? null,
            result: {
              content: [
                {
                  type: "text",
                  text: JSON.stringify({ echo: `Proxy echo: ${message}` }),
                },
              ],
            },
          });
        }

        if (params.name === "health") {
          return c.json({
            jsonrpc: "2.0",
            id: request.id ?? null,
            result: {
              content: [
                {
                  type: "text",
                  text: JSON.stringify({
                    status: "ok",
                    timestamp: new Date().toISOString(),
                  }),
                },
              ],
            },
          });
        }

        return c.json({
          jsonrpc: "2.0",
          id: request.id ?? null,
          error: {
            code: -32601,
            message: `Tool not found: ${params.name}`,
          },
        });
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

    logger.logError("proxy", "handleRequest", error as Error, {
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

// Graceful Shutdown (Phase 2: RedisとTelemetryのクリーンアップを追加)
const shutdown = async () => {
  logger.logInfo("Shutting down gracefully...");

  // Phase 2: Redisクリーンアップ
  await closeRedis();

  // Phase 2: Telemetryシャットダウン
  await shutdownTelemetry();

  process.exit(0);
};

process.on("SIGTERM", () => void shutdown());
process.on("SIGINT", () => void shutdown());

// サーバー起動
const port = Number(process.env.PORT) || 8080;

logger.logInfo(`Starting Tumiki MCP Proxy on port ${port}`, {
  nodeEnv: process.env.NODE_ENV,
  mode: "stateless (Hono + MCP SDK)",
});

// Node.js環境用のHTTPサーバー起動
if (process.env.NODE_ENV !== "test") {
  const { serve } = await import("@hono/node-server");
  serve({ fetch: app.fetch, port }, (info) => {
    logger.logInfo(`Server is running on http://localhost:${info.port}`);
  });
}

export default {
  port,
  fetch: app.fetch,
};
