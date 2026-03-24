import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import type { AppRouter } from "@/server/api/root";
import { logError } from "./errorHandling";

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
          "http://localhost:3000/api/trpc",

        // 認証トークンを自動的に付与
        headers: async () => {
          try {
            const token = await window.electronAPI.auth.getToken();
            return {
              authorization: token ? `Bearer ${token}` : "",
            };
          } catch (error) {
            // IPC障害等でトークン取得に失敗した場合はエラーを伝播
            // 未認証リクエストを黙って送信すると原因特定が困難になるため
            logError(error, "Failed to get auth token");
            throw error;
          }
        },

        // SuperJSON を使用したデータシリアライゼーション
        transformer: superjson,

        // フェッチオプション（AbortSignal.timeoutでタイムアウト管理）
        // caller側のsignal（React Queryのキャンセル等）とtimeoutを両立
        fetch: async (url, options) => {
          const signals: AbortSignal[] = [
            AbortSignal.timeout(REQUEST_TIMEOUT_MS),
          ];
          if (options?.signal) {
            signals.push(options.signal);
          }
          const fetchOptions: RequestInit = {
            ...options,
            signal: AbortSignal.any(signals),
          };

          return fetch(url, fetchOptions);
        },
      }),
    ],
  });
};
