import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

import type { GetHeadersFn, McpServerConfig } from "../types.js";

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

/** RequestInit.headers の型バリエーションを Record<string, string> に正規化する */
const normalizeHeaders = (
  init: RequestInit | undefined,
): Record<string, string> => {
  if (!init?.headers) return {};
  if (init.headers instanceof Headers) {
    return Object.fromEntries(init.headers.entries()) as Record<string, string>;
  }
  if (Array.isArray(init.headers)) {
    return Object.fromEntries(init.headers) as Record<string, string>;
  }
  return init.headers as Record<string, string>;
};

/**
 * HTTP 系トランスポート用の fetch ラッパーを生成する。
 * - getHeaders が指定されていれば毎リクエスト時に呼び出し、静的 headers を上書きする
 * - リクエスト失敗時に getHeaders を発火しないよう、ヘッダ取得失敗は静的 headers にフォールバック
 */
const buildDynamicFetch =
  (
    staticHeaders: Record<string, string>,
    getHeaders: GetHeadersFn | undefined,
  ): typeof fetch =>
  async (input, init) => {
    const existing = normalizeHeaders(init);
    let dynamic: Record<string, string> = staticHeaders;
    if (getHeaders) {
      try {
        dynamic = await getHeaders();
      } catch {
        // 動的取得失敗時は静的 headers で続行（fail-open）
        dynamic = staticHeaders;
      }
    }
    return fetch(input, {
      ...init,
      headers: { ...existing, ...dynamic },
    });
  };

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
      const sseFetch = buildDynamicFetch(config.headers, config.getHeaders);
      return new SSEClientTransport(new URL(config.url), {
        requestInit: {
          headers: config.headers,
        },
        eventSourceInit: {
          fetch: (url, init) => sseFetch(url, init),
        },
      });
    }
    case "STREAMABLE_HTTP":
      return new StreamableHTTPClientTransport(new URL(config.url), {
        requestInit: {
          headers: config.headers,
        },
        fetch: config.getHeaders
          ? buildDynamicFetch(config.headers, config.getHeaders)
          : undefined,
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
