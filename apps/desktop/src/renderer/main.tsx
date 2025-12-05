import React, { useState } from "react";
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

const Root = () => {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // リトライ戦略（utility関数を使用）
            retry: shouldRetryQuery,
            retryDelay: calculateRetryDelay,
            // ステイル時間（5分）
            staleTime: 5 * 60 * 1000,
            // キャッシュ時間（10分）
            gcTime: 10 * 60 * 1000,
            // ネットワークモード: オンライン時のみ実行
            networkMode: "online",
            // リフェッチ設定
            refetchOnWindowFocus: false,
            refetchOnReconnect: true,
            refetchOnMount: true,
          },
          mutations: {
            // Mutation のリトライは無効化（副作用があるため）
            retry: false,
            // ネットワークモード: オンライン時のみ実行
            networkMode: "online",
            // グローバル Mutation エラーハンドラー
            onError: (error) => {
              console.error("Mutation error:", error);
              // TODO: ユーザーへの通知（トースト等）
            },
          },
        },
      }),
  );
  const [trpcClient] = useState(() => createTRPCClient());

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
