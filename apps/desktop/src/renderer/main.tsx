import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "jotai";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App } from "./App";
import { trpc, createTRPCClient } from "./utils/trpc";
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
            // リトライ戦略
            retry: (failureCount, error) => {
              // ネットワークエラーの場合は3回までリトライ
              if (error instanceof Error && error.message.includes("fetch")) {
                return failureCount < 3;
              }
              // 認証エラー（401, 403）はリトライしない
              if (
                error &&
                typeof error === "object" &&
                "status" in error &&
                (error.status === 401 || error.status === 403)
              ) {
                return false;
              }
              // その他のエラーは1回のみリトライ
              return failureCount < 1;
            },
            retryDelay: (attemptIndex) =>
              Math.min(1000 * 2 ** attemptIndex, 30000),
            // ステイル時間（5分）
            staleTime: 5 * 60 * 1000,
            // キャッシュ時間（10分）
            gcTime: 10 * 60 * 1000,
            // オフライン対応: オフライン時もキャッシュデータを利用
            networkMode: "offlineFirst",
            // リフェッチ設定
            refetchOnWindowFocus: false,
            refetchOnReconnect: true,
            refetchOnMount: true,
          },
          mutations: {
            // Mutation のリトライは無効化（副作用があるため）
            retry: false,
            // オフライン対応: オフライン時は実行しない
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
