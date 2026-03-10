/**
 * MCP (Model Context Protocol) ツール統合
 * DBからツール定義を取得し、ツール実行時のみmcp-proxyに接続する遅延接続方式
 *
 * @see https://ai-sdk.dev/docs/ai-sdk-core/mcp-tools
 */
export {
  getMcpToolsFromServers,
  type GetMcpToolsFromServersResult,
} from "./mcp-client";
