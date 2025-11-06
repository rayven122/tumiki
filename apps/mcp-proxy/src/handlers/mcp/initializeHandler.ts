import { createJsonRpcSuccess } from "../../libs/jsonrpc/index.js";
import type { JsonRpcRequest } from "../../types/index.js";

/**
 * MCP initialize メソッドハンドラー
 * プロトコルハンドシェイクを実行し、サーバー情報を返します
 */
export const initializeHandler = (request: JsonRpcRequest) => {
  return createJsonRpcSuccess(request.id, {
    protocolVersion: "2024-11-05",
    capabilities: {
      tools: {},
    },
    serverInfo: {
      name: "Tumiki MCP Proxy",
      version: "0.1.0",
    },
  });
};
