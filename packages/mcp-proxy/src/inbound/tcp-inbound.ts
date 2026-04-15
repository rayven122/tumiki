import { createServer } from "node:net";
import type { Socket } from "node:net";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import type { ProxyCore } from "../core.js";
import type { Logger } from "../types.js";
import { createMcpInboundServer } from "./mcp-inbound-server.js";

/**
 * 127.0.0.1 上の TCP で MCP（JSON-RPC 行）を受け付ける。
 * Claude 等は stdio ブリッジ経由でこのソケットに接続する。
 */

export type LocalInboundServerHandle = {
  port: number;
  host: string;
  close: () => Promise<void>;
};

export const startLocalInboundServer = async (
  core: ProxyCore,
  logger: Logger,
): Promise<LocalInboundServerHandle> => {
  const host = "127.0.0.1";

  const netServer = createServer((socket: Socket) => {
    socket.setNoDelay(true);
    const mcpServer = createMcpInboundServer(core, logger);
    const transport = new StdioServerTransport(socket, socket);
    void mcpServer.connect(transport).catch((err: unknown) => {
      logger.error("MCP inbound 接続の処理に失敗しました", {
        error: err instanceof Error ? err.message : String(err),
      });
    });
  });

  await new Promise<void>((resolve, reject) => {
    netServer.once("error", reject);
    netServer.listen(0, host, () => resolve());
  });

  const addr = netServer.address();
  const port =
    typeof addr === "object" && addr !== null && "port" in addr ? addr.port : 0;

  logger.info(`ローカル MCP ブリッジを待ち受けています: ${host}:${port}`);

  return {
    port,
    host,
    close: async () => {
      await new Promise<void>((resolve, reject) => {
        netServer.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    },
  };
};
