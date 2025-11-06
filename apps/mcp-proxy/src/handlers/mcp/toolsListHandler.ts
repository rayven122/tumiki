import { createJsonRpcSuccess } from "../../libs/jsonrpc/index.js";
import type { ToolRouter } from "../../libs/mcp/index.js";
import type { JsonRpcRequest } from "../../types/index.js";

/**
 * MCP tools/list メソッドハンドラー
 * 利用可能なツールの一覧を返します
 */
export const toolsListHandler = async (
  request: JsonRpcRequest,
  toolRouter: ToolRouter,
  userMcpServerInstanceId: string,
) => {
  const tools = await toolRouter.getAllTools(userMcpServerInstanceId);

  return createJsonRpcSuccess(request.id, {
    tools: tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    })),
  });
};
