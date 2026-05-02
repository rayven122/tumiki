import "server-only";

import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";

import { db } from "@/server/db";

export const createTRPCContext = async (opts: { headers: Headers }) => {
  return { db, ...opts };
};

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter: ({ shape, error }) => ({
    ...shape,
    data: {
      ...shape.data,
      zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
    },
  }),
});

// Cloudflare Access が設定するヘッダーの存在を確認するミドルウェア。
// CF Access 設定ミスや内部ネットワークからの直接アクセスを防ぐアプリ層の多重防御。
const operatorGuard = t.middleware(({ ctx, next }) => {
  if (!ctx.headers.get("cf-access-jwt-assertion")) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "認証が必要です",
    });
  }
  return next({ ctx });
});

export const createCallerFactory = t.createCallerFactory;
export const createTRPCRouter = t.router;
export const procedure = t.procedure;
export const operatorProcedure = t.procedure.use(operatorGuard);

export type Context = Awaited<ReturnType<typeof createTRPCContext>>;
