import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "jotai";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App } from "./App";
import { trpc, createTRPCClient } from "./utils/trpc";
import { shouldRetryQuery, calculateRetryDelay } from "./utils/queryRetry";
import "./styles/globals.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Failed to find the root element");
}

/**
 * QueryClient設定値
 * 環境変数で設定可能（VITE_QUERY_STALE_TIME_MS, VITE_QUERY_GC_TIME_MS）
 */
const QUERY_STALE_TIME_MS =
  Number(import.meta.env.VITE_QUERY_STALE_TIME_MS) || 5 * 60 * 1000; // デフォルト5分
const QUERY_GC_TIME_MS =
  Number(import.meta.env.VITE_QUERY_GC_TIME_MS) || 10 * 60 * 1000; // デフォルト10分

/**
 * QueryClientをモジュールレベルでシングルトン化
 * コンポーネント再マウント時もクエリキャッシュを保持
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // リトライ戦略（utility関数を使用）
      retry: shouldRetryQuery,
      retryDelay: calculateRetryDelay,
      // ステイル時間（環境変数で設定可能、デフォルト5分）
      staleTime: QUERY_STALE_TIME_MS,
      // キャッシュ時間（環境変数で設定可能、デフォルト10分）
      gcTime: QUERY_GC_TIME_MS,
      // ネットワークモード: オフラインファースト設計
      networkMode: "offlineFirst",
      // リフェッチ設定
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      refetchOnMount: true,
    },
    mutations: {
      // Mutation のリトライは無効化（副作用があるため）
      retry: false,
      // ネットワークモード: オフラインファースト設計
      networkMode: "offlineFirst",
      // グローバル Mutation エラーハンドラー
      onError: (error) => {
        console.error("Mutation error:", error);
        // TODO: ユーザーへの通知（トースト等）
      },
    },
  },
});

/**
 * tRPCクライアントをモジュールレベルでシングルトン化
 * コンポーネント再マウント時も接続を保持
 */
const trpcClient = createTRPCClient();

const Root = () => {
  return (
    <React.StrictMode>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <Provider>
            <App />
          </Provider>
        </QueryClientProvider>
      </trpc.Provider>
    </React.StrictMode>
  );
};

ReactDOM.createRoot(rootElement).render(<Root />);
