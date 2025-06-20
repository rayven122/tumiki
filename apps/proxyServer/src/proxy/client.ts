import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import type { ServerConfig } from "../types/config.js";

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
                process.env[key] ?? value,
              ]),
            )
          : undefined,
      });
    }
  } catch (error) {
    console.error(
      `Failed to create transport ${server.transport.type ?? "stdio"} to ${
        server.name
      }:`,
      error,
    );
    console.error(`Transport ${server.name} not available.`);
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
    console.log(`Connecting to server: ${server.name}`);

    const waitFor = 2500;
    const retries = 3;
    let count = 0;
    let retry = true;

    while (retry) {
      const { client, transport } = createClient(server);
      if (!client || !transport) {
        break;
      }

      try {
        await client.connect(transport);
        console.log(`Connected to server: ${server.name}`);

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
        console.error(`Failed to connect to ${server.name}:`, error);
        count++;
        retry = count < retries;
        if (retry) {
          try {
            await client.close();
            // transportも確実にクローズする
            await transport.close();
          } catch (closeError) {
            console.error(
              `Error closing client/transport for ${server.name}:`,
              closeError,
            );
          } finally {
            console.log(
              `Retry connection to ${server.name} in ${waitFor}ms (${count}/${retries})`,
            );
            await sleep(waitFor);
          }
        } else {
          // リトライ終了時もtransportをクローズ
          try {
            await transport.close();
          } catch (closeError) {
            console.error(
              `Error closing transport for ${server.name}:`,
              closeError,
            );
          }
        }
      }
    }
  }

  return clients;
};
