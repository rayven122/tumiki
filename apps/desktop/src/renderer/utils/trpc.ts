import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import type { AppRouter } from "@/server/api/root";

// tRPC React Query フックを作成
export const trpc = createTRPCReact<AppRouter>();

// tRPC クライアント作成関数
export const createTRPCClient = () => {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url:
          import.meta.env.VITE_MANAGER_API_URL ||
          "https://local.tumiki.cloud:3000/api/trpc",

        // 認証トークンを自動的に付与
        headers: async () => {
          try {
            const token = await window.electronAPI.auth.getToken();
            return {
              authorization: token ? `Bearer ${token}` : "",
            };
          } catch (error) {
            console.error("Failed to get auth token:", error);
            return {};
          }
        },

        // SuperJSON を使用したデータシリアライゼーション
        transformer: superjson,

        // フェッチオプション
        fetch: async (url, options) => {
          try {
            // タイムアウト設定（30秒）
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000);

            const response = await fetch(url, {
              ...(options as RequestInit),
              signal: controller.signal,
            });

            clearTimeout(timeoutId);

            // エラーレスポンスの処理とエラー伝播
            if (!response.ok) {
              const error = new Error(
                `HTTP ${response.status}: ${response.statusText}`,
              ) as Error & { status?: number };
              error.status = response.status;
              console.error("tRPC request failed:", {
                status: response.status,
                url,
              });
              throw error;
            }

            return response;
          } catch (error) {
            // ネットワークエラーの詳細ログ
            console.error("tRPC network error:", {
              error,
              url,
            });
            throw error;
          }
        },
      }),
    ],
  });
};
