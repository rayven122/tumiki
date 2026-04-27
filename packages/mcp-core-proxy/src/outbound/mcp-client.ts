import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

import type { McpServerConfig } from "../types.js";

const SAFE_ENV_KEYS = [
  "PATH",
  "HOME",
  "USERPROFILE",
  "APPDATA",
  "TEMP",
  "TMP",
  "TMPDIR",
  "LANG",
  "USER",
  "USERNAME",
  "SHELL",
  "TERM",
  "NODE_ENV",
] as const;

const safeBaseEnv = Object.fromEntries(
  SAFE_ENV_KEYS.flatMap((key) => {
    const val = process.env[key];
    return val !== undefined ? [[key, val]] : [];
  }),
);

export type McpClientConnection = {
  client: Client;
  transport: Transport;
};

export type McpClientConnectionOptions = {
  clientName?: string;
};

const defaultClientName = "tumiki-proxy";
const clientVersion = "1.0.0";

const createClientTransport = (config: McpServerConfig): Transport => {
  switch (config.transportType) {
    case "STDIO": {
      const mergedEnv = { ...safeBaseEnv, ...config.env };
      return new StdioClientTransport({
        command: config.command,
        args: config.args,
        env: mergedEnv,
      });
    }
    case "SSE":
      return new SSEClientTransport(new URL(config.url), {
        requestInit: {
          headers: config.headers,
        },
        eventSourceInit: {
          fetch: (url: string | URL, init?: RequestInit) => {
            const existingHeaders: Record<string, string> =
              init?.headers instanceof Headers
                ? (Object.fromEntries(init.headers.entries()) as Record<
                    string,
                    string
                  >)
                : Array.isArray(init?.headers)
                  ? (Object.fromEntries(init.headers) as Record<string, string>)
                  : ((init?.headers ?? {}) as Record<string, string>);

            return fetch(url, {
              ...init,
              headers: { ...existingHeaders, ...config.headers },
            });
          },
        },
      });
    case "STREAMABLE_HTTP":
      return new StreamableHTTPClientTransport(new URL(config.url), {
        requestInit: {
          headers: config.headers,
        },
      });
    default: {
      const _exhaustive: never = config;
      throw new Error(
        `未対応のトランスポートタイプ: ${JSON.stringify(_exhaustive)}`,
      );
    }
  }
};

export const createMcpClient = (
  config: McpServerConfig,
  options?: McpClientConnectionOptions,
): McpClientConnection => {
  const transport = createClientTransport(config);
  const client = new Client(
    {
      name: options?.clientName ?? defaultClientName,
      version: clientVersion,
    },
    {
      capabilities: {},
    },
  );

  return {
    client,
    transport,
  };
};

export const connectMcpClient = async (
  config: McpServerConfig,
  options?: McpClientConnectionOptions,
): Promise<Client> => {
  const { client, transport } = createMcpClient(config, options);
  await client.connect(transport);
  return client;
};
