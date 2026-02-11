"use client";

/**
 * 実行用トランスポート設定のユーティリティフック
 *
 * チャットとエージェント実行で共通のトランスポート設定を提供
 */

import { useRef, useEffect, useCallback, useMemo } from "react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useSession } from "next-auth/react";
import { getProxyServerUrl } from "@/utils/url";
import { fetchWithErrorHandlers } from "@/lib/utils";

type UseExecutionTransportParams = {
  /** API エンドポイント（例: /chat, /agent/:id） */
  apiPath: string;
  /** リクエストボディを準備する関数 */
  prepareSendMessagesRequest?: (request: {
    id?: string;
    messages: UIMessage[];
    body?: Record<string, unknown>;
  }) => { body: Record<string, unknown> };
};

type UseExecutionTransportReturn = {
  /** DefaultChatTransport インスタンス */
  transport: DefaultChatTransport<UIMessage>;
  /** セッションが準備完了かどうか */
  isSessionReady: boolean;
  /** アクセストークン（認証ヘッダー用） */
  accessToken: string | undefined;
};

/**
 * mcp-proxy への認証付きトランスポートを作成するフック
 *
 * チャットとエージェント実行で共通の認証ロジックを提供
 */
export const useExecutionTransport = ({
  apiPath,
  prepareSendMessagesRequest,
}: UseExecutionTransportParams): UseExecutionTransportReturn => {
  const { data: session, status: sessionStatus } = useSession();

  // セッションのアクセストークンをrefで保持（クロージャ問題回避）
  const accessTokenRef = useRef<string | undefined>(session?.accessToken);
  useEffect(() => {
    accessTokenRef.current = session?.accessToken;
  }, [session?.accessToken]);

  const isSessionReady =
    sessionStatus === "authenticated" && !!session?.accessToken;

  const mcpProxyUrl = getProxyServerUrl();

  const fetchWithAuth = useCallback(
    (url: string | URL | Request, options?: RequestInit) => {
      const headers = new Headers(options?.headers);
      if (accessTokenRef.current) {
        headers.set("Authorization", `Bearer ${accessTokenRef.current}`);
      }
      return fetchWithErrorHandlers(url, {
        ...options,
        headers,
      });
    },
    [],
  );

  // トランスポートをメモ化
  const transport = useMemo(
    () =>
      new DefaultChatTransport<UIMessage>({
        api: `${mcpProxyUrl}${apiPath}`,
        fetch: fetchWithAuth,
        prepareSendMessagesRequest,
      }),
    [mcpProxyUrl, apiPath, fetchWithAuth, prepareSendMessagesRequest],
  );

  return {
    transport,
    isSessionReady,
    accessToken: session?.accessToken,
  };
};
