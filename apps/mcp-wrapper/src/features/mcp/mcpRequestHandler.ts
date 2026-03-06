import type { Context } from "hono";
import type { HonoEnv } from "../../shared/types/honoEnv.js";
import { getServerConfigQuery } from "./queries/getServerConfig/getServerConfigQuery.js";
import { forwardRequestCommand } from "./commands/forwardRequest/forwardRequestCommand.js";
import { ServerNotFoundError } from "../../domain/errors/serverNotFoundError.js";
import { DomainError } from "../../domain/errors/domainError.js";
import { logInfo, logError } from "../../shared/logger/index.js";
import {
  type JsonRpcRequest,
  JSON_RPC_ERROR_CODES,
} from "../../shared/types/jsonRpc.js";

/**
 * MCPリクエストハンドラー
 *
 * POST /mcp/:serverName へのリクエストを処理し、
 * 対応するMCPプロセスにJSON-RPCリクエストを転送する
 */
export const mcpRequestHandler = async (
  c: Context<HonoEnv>,
): Promise<Response> => {
  const serverName = c.req.param("serverName");

  logInfo("MCP request received", { serverName });

  try {
    const request = await c.req.json<JsonRpcRequest>();

    // 1. サーバー設定を取得
    const serverConfig = await getServerConfigQuery({ serverName });

    // 2. リクエストを転送
    const response = await forwardRequestCommand({
      serverConfig,
      headers: Object.fromEntries(Array.from(c.req.raw.headers.entries())),
      request,
    });

    return c.json(response);
  } catch (error) {
    if (error instanceof ServerNotFoundError) {
      return c.json(
        {
          jsonrpc: "2.0",
          id: null,
          error: {
            code: JSON_RPC_ERROR_CODES.SERVER_NOT_FOUND,
            message: error.message,
          },
        },
        404,
      );
    }

    if (error instanceof DomainError) {
      return c.json(
        {
          jsonrpc: "2.0",
          id: null,
          error: {
            code: JSON_RPC_ERROR_CODES.PROCESS_ERROR,
            message: error.message,
          },
        },
        500,
      );
    }

    logError("Unexpected error in MCP handler", error as Error, { serverName });
    throw error;
  }
};
