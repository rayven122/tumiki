import {
  createJsonRpcSuccess,
  createJsonRpcError,
} from "../../libs/jsonrpc/index.js";
import type { ToolRouter } from "../../libs/mcp/index.js";
import type { JsonRpcRequest } from "../../types/index.js";

/**
 * MCP tools/call メソッドハンドラー
 * 指定されたツールを実行し、結果を返します
 */
export const toolsCallHandler = async (
  request: JsonRpcRequest,
  toolRouter: ToolRouter,
  userMcpServerInstanceId: string,
) => {
  const params = request.params as
    | {
        name: string;
        arguments: Record<string, unknown>;
      }
    | undefined;

  if (!params?.name) {
    return createJsonRpcError(
      request.id,
      -32602,
      "Invalid params: name is required",
    );
  }

  const result = await toolRouter.callTool(
    userMcpServerInstanceId,
    params.name,
    params.arguments ?? {},
  );

  return createJsonRpcSuccess(request.id, {
    content: result.content,
  });
};
