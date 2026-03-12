import { initTRPC } from "@trpc/server";
import superjson from "superjson";

/**
 * AppRouter型定義
 * managerアプリのtRPCルーターと同じ型を共有する
 * TODO: 共有パッケージからインポートする形に移行
 */
const t = initTRPC.create({ transformer: superjson });

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- 型推論のためにのみ使用
const placeholderRouter = t.router({});
export type AppRouter = typeof placeholderRouter;
