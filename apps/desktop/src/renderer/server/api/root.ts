import { initTRPC } from "@trpc/server";
import superjson from "superjson";

/**
 * AppRouter型定義
 * managerアプリのtRPCルーターと同じ型を共有する
 * TODO: 共有パッケージからインポートする形に移行
 */
const t = initTRPC.create({ transformer: superjson });

const _placeholderRouter = t.router({});
export type AppRouter = typeof _placeholderRouter;
