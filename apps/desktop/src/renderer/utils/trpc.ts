import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import type { AppRouter } from "@/server/api/root";
import { logError, toErrorWithStatus } from "./errorHandling";

// リクエストタイムアウト設定（ミリ秒）
// デスクトップアプリケーションでは10秒が適切なタイムアウト時間
const REQUEST_TIMEOUT_MS = 10000;

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
          // タイムアウト設定（10秒）
          const controller = new AbortController();

          // tRPCのfetchオプション型定義
          type TRPCFetchOptions = RequestInit & {
            signal?: AbortSignal;
          };

          // optionsがundefinedまたはnullの場合の処理
          const fetchOptions: TRPCFetchOptions = {
            ...(options as RequestInit | undefined),
            signal: controller.signal,
          };

          // Promise.raceで確実なタイムアウト処理
          const fetchPromise = fetch(url, fetchOptions);

          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => {
              controller.abort();
              reject(
                new Error(
                  `Request timeout after ${REQUEST_TIMEOUT_MS / 1000} seconds`,
                ),
              );
            }, REQUEST_TIMEOUT_MS);
          });

          try {
            const response = await Promise.race([fetchPromise, timeoutPromise]);

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
