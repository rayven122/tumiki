import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import type { ServerConfig } from "../../infrastructure/types/config.js";
import { logger } from "../../infrastructure/utils/logger.js";
import { config } from "../../infrastructure/config/index.js";
import { recordError } from "../../infrastructure/utils/metrics.js";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export type ConnectedClient = {
  client: Client;
  cleanup: () => Promise<void>;
  name: string;
  toolNames: string[];
};

/**
 * MCP サーバーに接続する(stdio か sse のどちらか)
 * @param server
 * @returns
 */
const createClient = (
  server: ServerConfig,
): { client: Client | undefined; transport: Transport | undefined } => {
  let transport: Transport | null = null;
  try {
    if (server.transport.type === "sse") {
      transport = new SSEClientTransport(new URL(server.transport.url));
    } else {
      transport = new StdioClientTransport({
        command: server.transport.command,
        args: server.transport.args,
        env: server.transport.env
          ? Object.fromEntries(
              Object.entries(server.transport.env).map(([key, value]) => [
                key,
                process.env[key] ?? String(value),
              ]),
            )
          : undefined,
      });
    }
  } catch (error) {
    logger.error("Failed to create transport", {
      transportType: server.transport.type ?? "stdio",
      serverName: server.name,
      error: error instanceof Error ? error.message : String(error),
    });
    recordError("transport_creation_failed");
    return { transport: undefined, client: undefined };
  }

  const client = new Client({
    name: "mcp-proxy-client",
    version: "1.0.0",
  });

  return { client, transport };
};

/**
 * 複数のサーバーに接続する
 * 接続に失敗したら、2.5秒待ってから再接続を試みる
 * 3回失敗したら、エラーをスローする
 * @param servers
 * @returns
 */
export const createClients = async (
  servers: ServerConfig[],
): Promise<ConnectedClient[]> => {
  const clients: ConnectedClient[] = [];

  for (const server of servers) {
    logger.info("Connecting to server", { serverName: server.name });

    const waitFor = config.retry.delayMs;
    const retries = config.retry.maxAttempts;
    let count = 0;
    let retry = true;

    while (retry) {
      const { client, transport } = createClient(server);
      if (!client || !transport) {
        break;
      }

      try {
        await client.connect(transport);
        logger.info("Successfully connected to server", {
          serverName: server.name,
        });

        clients.push({
          client,
          name: server.name,
          cleanup: async () => {
            await transport.close();
          },
          toolNames: server.toolNames,
        });

        break;
      } catch (error) {
        logger.error("Failed to connect to server", {
          serverName: server.name,
          error: error instanceof Error ? error.message : String(error),
          attempt: count + 1,
          maxAttempts: retries,
        });
        recordError("server_connection_failed");
        count++;
        retry = count < retries;
        if (retry) {
          try {
            await client.close();
            // transportも確実にクローズする
            await transport.close();
          } catch (closeError) {
            logger.error("Error closing client/transport during retry", {
              serverName: server.name,
              error:
                closeError instanceof Error
                  ? closeError.message
                  : String(closeError),
            });
          } finally {
            logger.debug("Retrying connection", {
              serverName: server.name,
              delayMs: waitFor,
              attempt: count,
              maxAttempts: retries,
            });
            await sleep(waitFor);
          }
        } else {
          // リトライ終了時もtransportをクローズ
          try {
            await transport.close();
          } catch (closeError) {
            logger.error("Error closing transport after retry exhaustion", {
              serverName: server.name,
              error:
                closeError instanceof Error
                  ? closeError.message
                  : String(closeError),
            });
          }
        }
      }
    }
  }

  return clients;
};
