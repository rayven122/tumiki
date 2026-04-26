import {
  createCallerFactory,
  createTRPCRouter,
  publicProcedure,
} from "@/server/api/trpc";
import { scimTokenRouter } from "./routers/scim-token";

/**
 * サーバーのメインルーター。
 *
 * /api/routers に追加したルーターはすべてここに手動で追加すること。
 */
export const appRouter = createTRPCRouter({
  // ダミールーター（型推論のため）
  health: publicProcedure.query(() => {
    return { status: "ok" };
  }),
  scimToken: scimTokenRouter,
});

// APIの型定義をエクスポート
export type AppRouter = typeof appRouter;

/**
 * tRPC APIのサーバーサイド呼び出し元を生成する。
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
