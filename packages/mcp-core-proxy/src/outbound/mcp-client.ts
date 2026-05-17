import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

import type { McpServerConfig, ResolveHeaders } from "../types.js";

/**
 * RequestInit["headers"] を Record<string, string> に正規化する。
 * MCP SDK が Headers / 配列 / オブジェクト いずれの形式で渡してきても扱えるようにする。
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
 * 静的ヘッダーと、必要なら resolveHeaders から取得した動的ヘッダーを
 * 既存 init.headers にマージするカスタム fetch を生成する。
 *
 * マージ優先度: dynamicHeaders > staticHeaders > existingHeaders（後勝ち）。
 * これにより、OAuth リフレッシュで得た最新トークンが古い静的トークンを上書きする。
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

    // Headers の case-insensitive 重複を防ぐため、必ず Headers インスタンス経由でマージする。
    // plain object で `{ Authorization, authorization }` の両方を保持して fetch に渡すと、
    // Headers コンストラクタが両方を残してカンマ結合し、不正な
    // "Bearer X, Bearer Y" を送ってしまう（SDK は init.headers に小文字 `authorization` を
    // 入れるため、`Authorization` キーで上書きしようとしても保てない）。
    const merged = new Headers();
    for (const [k, v] of Object.entries(normalizeHeaders(init?.headers))) {
      merged.set(k, v);
    }
    for (const [k, v] of Object.entries(staticHeaders)) {
      merged.set(k, v);
    }
    for (const [k, v] of Object.entries(dynamicHeaders)) {
      merged.set(k, v);
    }
    return fetch(input, { ...init, headers: merged });
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
      // W3C EventSource 仕様では requestInit.headers が無視されるため、
      // eventSourceInit.fetch にカスタム fetch を渡してヘッダーをマージする必要がある。
      // STREAMABLE_HTTP と異なり、静的ヘッダーのみの場合でも常にカスタム fetch が必要。
      const customFetch = createCustomFetch(
        config.headers,
        config.resolveHeaders,
      );
      return new SSEClientTransport(new URL(config.url), {
        requestInit: { headers: config.headers },
        eventSourceInit: { fetch: customFetch },
        // POST /messages 用の fetch は resolveHeaders 指定時のみ差し替える
        // （非OAuth接続の挙動を変えないため）
        ...(config.resolveHeaders ? { fetch: customFetch } : {}),
      });
    }
    case "STREAMABLE_HTTP":
      return new StreamableHTTPClientTransport(new URL(config.url), {
        requestInit: { headers: config.headers },
        // resolveHeaders 指定時のみ fetch を差し替える
        ...(config.resolveHeaders
          ? { fetch: createCustomFetch(config.headers, config.resolveHeaders) }
          : {}),
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
