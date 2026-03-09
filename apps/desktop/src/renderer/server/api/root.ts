import type { initTRPC } from "@trpc/server";

/**
 * AppRouter型定義
 * managerアプリのtRPCルーターと同じ型を共有する
 * TODO: 共有パッケージからインポートする形に移行
 */

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
type EmptyRouter = ReturnType<
  ReturnType<(typeof initTRPC)["create"]>["router"]
>;

export type AppRouter = EmptyRouter;
