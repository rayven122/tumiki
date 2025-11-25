import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import superjson from "superjson";

// TODO: Manager パッケージから AppRouter 型を正しく import する
// 現在は型エラー回避のため unknown を使用
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AppRouter = any;

// tRPC React Query フックを作成
export const trpc = createTRPCReact<AppRouter>();

// tRPC クライアント作成関数
export const createTRPCClient = () => {
  // @ts-expect-error - tRPC型定義の一時的な回避
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
      }),
    ],
  });
};
