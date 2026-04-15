/**
 * スタンドアロン CLI: プロセス内 ProxyCore に対する stdio MCP
 */
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import type { ProxyCore } from "../core.js";
import type { Logger } from "../types.js";
import { createMcpInboundServer } from "./mcp-inbound-server.js";

/**
 * stdio inboundサーバーを起動（tumiki-mcp-proxy 単体利用時）
 */
export const startStdioInbound = async (
  core: ProxyCore,
  logger: Logger,
): Promise<void> => {
  const server = createMcpInboundServer(core, logger);

  const tools = await core.listTools();
  logger.info(`${tools.length}個のツールをstdio inboundに登録しました`);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  logger.info("stdio inboundサーバーを開始しました");
};
