/**
 * MCP リクエストハンドラー
 *
 * Hono のルートハンドラーとして MCP プロトコルリクエストを処理する
 */

import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { ReAuthRequiredError } from "@tumiki/oauth-token-manager";
import { toFetchResponse, toReqRes } from "fetch-to-node";
import type { Context } from "hono";

import {
  handleError,
  toError,
  isReAuthRequiredError,
  createReAuthResponse,
} from "../../shared/errors/index.js";
import type { HonoEnv } from "../../shared/types/honoEnv.js";
import type { ReAuthErrorContainer } from "./commands/callTool/callToolHandler.js";
import { getExecutionContext } from "./middleware/requestLogging/context.js";
import { createMcpServer } from "./mcpServerFactory.js";

/**
 * ReAuthRequiredError に対する 401 JSON レスポンスを生成
 */
const toReAuthJsonResponse = (
  c: Context<HonoEnv>,
  error: ReAuthRequiredError,
  mcpServerId: string,
  requestId: string | number | null,
) => {
  const baseUrl =
    process.env.NEXT_PUBLIC_MCP_PROXY_URL ?? "http://localhost:8080";
  const reAuthResponse = createReAuthResponse(
    error,
    mcpServerId,
    requestId,
    baseUrl,
  );
  return c.json(reAuthResponse.jsonRpcError, 401, reAuthResponse.headers);
};

/**
 * MCP メインハンドラー
 *
 * Low-Level Server API を使用して JSON-RPC 2.0 リクエストを自動処理
 */
export const mcpRequestHandler = async (c: Context<HonoEnv>) => {
  const mcpServerId = c.req.param("mcpServerId");

  // 認証コンテキストから情報を取得
  const authContext = c.get("authContext");
  if (!authContext) {
    throw new Error("Authentication context not found");
  }

  const { organizationId, userId } = authContext;

  // ReAuthRequiredError を保存するためのコンテナ
  // SDK 内部で発生したエラーを外側で処理するために使用
  const reAuthErrorContainer: ReAuthErrorContainer = {
    error: null,
    requestId: null,
  };

  try {
    // MCPサーバーインスタンスを作成（エラーコンテナを渡す）
    const server = createMcpServer({
      mcpServerId,
      organizationId,
      userId,
      reAuthErrorContainer,
    });

    // HTTPトランスポートを作成（ステートレスモード）
    // Cloud Run向けにセッション管理を無効化
    // enableJsonResponse: true でSSEではなくJSON形式でレスポンスを返す
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // ステートレスモード
      enableJsonResponse: true, // PIIマスキングのためJSON形式でレスポンス
    });

    // サーバーとトランスポートを接続
    await server.connect(transport);

    // HonoのFetch APIリクエスト/レスポンスをNode.js形式に変換
    const { req, res } = toReqRes(c.req.raw);

    // HTTPリクエストを処理
    // SDKがJSON-RPC 2.0プロトコル（検証、ルーティング、エラー処理）を自動処理
    // PIIマスキング済みボディがある場合はそれを使用（piiMaskingMiddlewareで設定）
    const executionContext = getExecutionContext();
    const body: unknown = executionContext?.requestBody ?? (await c.req.json());
    await transport.handleRequest(req, res, body);

    // ReAuthRequiredError が発生した場合は 401 レスポンスを返す
    // SDK は内部でエラーを処理するため、ここでキャッチして 401 に変換
    if (reAuthErrorContainer.error) {
      return toReAuthJsonResponse(
        c,
        reAuthErrorContainer.error,
        mcpServerId,
        reAuthErrorContainer.requestId,
      );
    }

    // Node.jsレスポンスをFetch APIレスポンスに変換して返却
    return toFetchResponse(res);
  } catch (error) {
    // 外側で ReAuthRequiredError をキャッチした場合も 401 を返す
    if (isReAuthRequiredError(error)) {
      return toReAuthJsonResponse(c, error, mcpServerId, null);
    }

    return handleError(c, toError(error), {
      requestId: null,
      errorCode: -32603,
      errorMessage: "Internal error",
      organizationId,
      instanceId: mcpServerId,
      logMessage: "Failed to handle MCP request",
    });
  }
};
