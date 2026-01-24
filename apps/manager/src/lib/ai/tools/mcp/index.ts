/**
 * MCP (Model Context Protocol) ツール統合
 * @ai-sdk/mcp を使用して AI SDK Tool 形式への変換を自動的に行う
 *
 * @see https://ai-sdk.dev/docs/ai-sdk-core/mcp-tools
 */
export {
  getMcpToolsFromServer,
  getMcpToolsFromServers,
  closeMcpClients,
  type McpServerError,
  type GetMcpToolsFromServersResult,
} from "./mcp-client";
