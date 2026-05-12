import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

import type { McpServerConfig, ResolveHeaders } from "../types.js";

/**
 * RequestInit["headers"] を Record<string, string> に正規化する
 */
const normalizeHeaders = (
  headers?: RequestInit["headers"],
): Record<string, string> => {
  if (!headers) return {};
  if (headers instanceof Headers) {
    return Object.fromEntries(headers.entries()) as Record<string, string>;
  }
  if (Array.isArray(headers)) {
    return Object.fromEntries(headers) as Record<string, string>;
  }
  return headers as Record<string, string>;
};

/**
 * 静的ヘッダーをマージするカスタム fetch を生成する。
 * resolveHeaders が指定されている場合、リクエスト毎に動的ヘッダーも追加する。
 */
const createCustomFetch = (
  staticHeaders: Record<string, string>,
  resolveHeaders?: ResolveHeaders,
): typeof fetch => {
  return async (
    input: string | URL | Request,
    init?: RequestInit,
  ): Promise<Response> => {
    const dynamicHeaders = resolveHeaders ? await resolveHeaders() : {};
    const existingHeaders = normalizeHeaders(init?.headers);
    return fetch(input, {
      ...init,
      headers: { ...existingHeaders, ...staticHeaders, ...dynamicHeaders },
    });
  };
};

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
    case "SSE": {
      const customFetch = createCustomFetch(
        config.headers,
        config.resolveHeaders,
      );
      return new SSEClientTransport(new URL(config.url), {
        requestInit: { headers: config.headers },
        eventSourceInit: { fetch: customFetch },
        ...(config.resolveHeaders ? { fetch: customFetch } : {}),
      });
    }
    case "STREAMABLE_HTTP": {
      return new StreamableHTTPClientTransport(new URL(config.url), {
        requestInit: { headers: config.headers },
        ...(config.resolveHeaders
          ? { fetch: createCustomFetch(config.headers, config.resolveHeaders) }
          : {}),
      });
    }
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
