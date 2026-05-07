"use client";

import { type QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchStreamLink, loggerLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import { useState } from "react";
import SuperJSON from "superjson";

import type { AppRouter } from "@/server/api/root";
import { createQueryClient } from "./query-client";

const getBaseUrl = () => {
  if (typeof window !== "undefined") return window.location.origin;
  return `http://localhost:${process.env.PORT ?? 3200}`;
};

let clientQueryClientSingleton: QueryClient | undefined = undefined;

const getQueryClient = () => {
  if (typeof window === "undefined") {
    // サーバー: 毎回新しいクエリクライアントを生成する
    return createQueryClient();
  }
  // ブラウザ: シングルトンパターンで同一のクエリクライアントを使い回す
  clientQueryClientSingleton ??= createQueryClient();

  return clientQueryClientSingleton;
};

export const api = createTRPCReact<AppRouter>();

/**
 * 入力型の推論ヘルパー。
 *
 * @example type CreateTenantInput = RouterInputs['tenant']['create']
 */
export type RouterInputs = inferRouterInputs<AppRouter>;

/**
 * 出力型の推論ヘルパー。
 *
 * @example type TenantListOutput = RouterOutputs['tenant']['list']
 */
export type RouterOutputs = inferRouterOutputs<AppRouter>;

export const TRPCReactProvider = (props: { children: React.ReactNode }) => {
  const queryClient = getQueryClient();

  const [trpcClient] = useState(() =>
    api.createClient({
      links: [
        loggerLink({
          enabled: (op) =>
            process.env.NODE_ENV === "development" ||
            (op.direction === "down" && op.result instanceof Error),
        }),
        httpBatchStreamLink({
          transformer: SuperJSON,
          url: `${getBaseUrl()}/api/trpc`,
          headers: () => {
            const headers = new Headers();
            headers.set("x-trpc-source", "nextjs-react");
            return headers;
          },
        }),
      ],
    }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <api.Provider client={trpcClient} queryClient={queryClient}>
        {props.children}
      </api.Provider>
    </QueryClientProvider>
  );
};
