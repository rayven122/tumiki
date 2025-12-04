import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import type { AppRouter } from "@/server/api/root";
import { logError, toErrorWithStatus } from "./errorHandling";

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
            logError(error, "Failed to get auth token");
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
              const errorWithStatus = toErrorWithStatus({
                message: `HTTP ${response.status}: ${response.statusText}`,
                status: response.status,
                name: "HTTPError",
              });
              logError(errorWithStatus, "tRPC request failed");
              throw errorWithStatus;
            }

            return response;
          } catch (error) {
            // ネットワークエラーの統一されたログ記録
            logError(error, "tRPC network error");
            throw error;
          }
        },
      }),
    ],
  });
};
