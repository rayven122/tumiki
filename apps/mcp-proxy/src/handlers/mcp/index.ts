import type { Context } from "hono";
import type { HonoEnv, JsonRpcRequest } from "../../types/index.js";
import { ToolRouter } from "../../libs/mcp/index.js";
import { createJsonRpcError } from "../../libs/jsonrpc/index.js";
import { handleError } from "../../libs/error/handler.js";
import { initializeHandler } from "./initializeHandler.js";
import { toolsListHandler } from "./toolsListHandler.js";
import { toolsCallHandler } from "./toolsCallHandler.js";

const toolRouter = new ToolRouter();

/**
 * MCPメインハンドラー
 * JSON-RPCリクエストを受け取り、適切なハンドラーにルーティングします
 */
export const mcpHandler = async (c: Context<HonoEnv>) => {
  const authInfo = c.get("authInfo");
  const userMcpServerInstanceId = c.req.param("userMcpServerInstanceId");

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

    // メソッドハンドラーマッピング
    const handlers: Record<
      string,
      (
        request: JsonRpcRequest,
        toolRouter: ToolRouter,
        instanceId: string,
      ) => Promise<Record<string, unknown>>
    > = {
      initialize: async (req) =>
        initializeHandler(req) as Record<string, unknown>,
      "tools/list": async (req, router, instanceId) =>
        (await toolsListHandler(req, router, instanceId)) as Record<
          string,
          unknown
        >,
      "tools/call": async (req, router, instanceId) =>
        (await toolsCallHandler(req, router, instanceId)) as Record<
          string,
          unknown
        >,
    };

    const handler = handlers[request.method];

    if (!handler) {
      return c.json(
        createJsonRpcError(
          request.id,
          -32601,
          `Method not found: ${request.method}`,
        ),
      );
    }

    // ハンドラー実行
    try {
      const result = await handler(
        request,
        toolRouter,
        userMcpServerInstanceId,
      );
      return c.json(result);
    } catch (error) {
      return handleError(c, error as Error, {
        requestId: request.id,
        errorCode: -32603,
        errorMessage:
          request.method === "tools/list"
            ? "Failed to list tools"
            : request.method === "tools/call"
              ? "Tool execution failed"
              : "Internal error",
        authInfo,
        instanceId: userMcpServerInstanceId,
        logMessage: `Failed to handle method: ${request.method}`,
        additionalMetadata:
          request.method === "tools/call"
            ? {
                toolName: (request.params as { name?: string } | undefined)
                  ?.name,
              }
            : undefined,
      });
    }
  } catch (error) {
    return handleError(c, error as Error, {
      requestId: null,
      errorCode: -32603,
      errorMessage: "Internal error",
      authInfo,
      instanceId: userMcpServerInstanceId,
      logMessage: "Failed to handle request",
    });
  }
};
