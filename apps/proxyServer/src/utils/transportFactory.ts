/**
 * @fileoverview トランスポートファクトリ
 * Streamable HTTPSトランスポートの作成ロジックを共通化
 */

import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { createCloudRunHeaders } from "./cloudRunAuth.js";
import { isValidApiKey, isApiKeyHeader, sanitizeHeaders } from "./security.js";
import type { TransportConfigStreamableHTTPS } from "../libs/types.js";

/**
 * Streamable HTTPSトランスポート用のヘッダーを構築
 * @param config - トランスポート設定
 * @returns HTTPヘッダー
 */
const buildTransportHeaders = async (
  config: TransportConfigStreamableHTTPS,
): Promise<Record<string, string>> => {
  const customHeaders: Record<string, string> = {};

  // Cloud Run IAM認証が必要な場合、認証ヘッダーを作成
  if (config.requireCloudRunAuth) {
    const authHeaders = await createCloudRunHeaders();
    Object.assign(customHeaders, authHeaders);
  }

  // 環境変数からHTTPヘッダーを設定（APIキーなど）
  if (config.env) {
    for (const [headerName, value] of Object.entries(config.env)) {
      // APIキーの形式検証
      if (isApiKeyHeader(headerName) && !isValidApiKey(value)) {
        throw new Error(`Invalid API key format for header: ${headerName}`);
      }
      customHeaders[headerName] = value;
    }
  }

  return customHeaders;
};

/**
 * カスタムfetch関数を作成（ヘッダー追加用）
 * @param headers - 追加するHTTPヘッダー
 * @returns カスタムfetch関数
 */
const createCustomFetch = (headers: Record<string, string>): typeof fetch => {
  return async (input, init) => {
    const mergedHeaders = {
      ...headers,
      ...(init?.headers as Record<string, string>),
    };

    // ログ出力用にヘッダーをサニタイズ（開発環境のみ）
    if (process.env.NODE_ENV === "development") {
      const sanitized = sanitizeHeaders(mergedHeaders);
      console.debug("Request headers (sanitized):", sanitized);
    }

    return fetch(input, {
      ...init,
      headers: mergedHeaders,
    });
  };
};

/**
 * Streamable HTTPSトランスポートを作成
 * @param config - トランスポート設定
 * @returns Streamable HTTPSトランスポート
 */
export const createStreamableHttpsTransport = async (
  config: TransportConfigStreamableHTTPS,
): Promise<StreamableHTTPClientTransport> => {
  const headers = await buildTransportHeaders(config);
  const customFetch = createCustomFetch(headers);
  const url = new URL(config.url);

  return new StreamableHTTPClientTransport(url, {
    fetch: customFetch,
  });
};
