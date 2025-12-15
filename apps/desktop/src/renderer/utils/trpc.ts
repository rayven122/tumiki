import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import type { AppRouter } from "@/server/api/root";
import { logError, toErrorWithStatus, classifyError } from "./errorHandling";

// リクエストタイムアウト設定（ミリ秒）
// デスクトップアプリケーションでは30秒が適切なタイムアウト時間
// 環境変数で設定可能（VITE_REQUEST_TIMEOUT_MS）
const REQUEST_TIMEOUT_MS =
  Number(import.meta.env.VITE_REQUEST_TIMEOUT_MS) || 30000;

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
            // トークン取得失敗時はログを記録し、認証なしでリクエストを継続
            logError(error, "Failed to get auth token");
            return {
              authorization: "",
            };
          }
        },

        // SuperJSON を使用したデータシリアライゼーション
        transformer: superjson,

        // フェッチオプション
        fetch: async (url, options) => {
          // タイムアウト設定
          const controller = new AbortController();

          // 型ガード: optionsがRequestInit互換かどうかを検証
          const isRequestInit = (
            opt: unknown,
          ): opt is RequestInit | undefined => {
            return (
              opt === undefined ||
              opt === null ||
              (typeof opt === "object" && opt !== null)
            );
          };

          // optionsの型安全な変換
          const baseOptions = isRequestInit(options) ? options : undefined;
          const fetchOptions: RequestInit = {
            ...baseOptions,
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
            // エラー分類を使用した統一されたログ記録
            const errorInfo = classifyError(error);
            logError(error, `tRPC ${errorInfo.category} error`);
            throw error;
          }
        },
      }),
    ],
  });
};
