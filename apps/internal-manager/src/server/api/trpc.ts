import "server-only";

import { TRPCError, initTRPC } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";

import { db, Role } from "@tumiki/internal-db/server";
import { auth } from "~/auth";

/**
 * 1. コンテキスト
 *
 * このセクションはバックエンドAPIで利用可能な「コンテキスト」を定義します。
 *
 * これらによりリクエスト処理時にデータベース、セッションなどへアクセスできます。
 *
 * このヘルパーはtRPCコンテキストの「内部」を生成します。
 * APIハンドラーとRSCクライアントはこれをラップして必要なコンテキストを提供します。
 *
 * @see https://trpc.io/docs/server/context
 */
export const createTRPCContext = async (opts: { headers: Headers }) => {
  const session = await auth();

  return {
    db,
    session: session ?? null,
    ...opts,
  };
};

/**
 * 2. 初期化
 *
 * ここでtRPC APIが初期化され、コンテキストとトランスフォーマーが接続されます。
 * また、バックエンドでバリデーションエラーが発生した場合にフロントエンドで型安全性を
 * 保つためにZodErrorをパースします。
 */
const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter: ({ shape, error }) => {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

/**
 * サーバーサイドの呼び出し元を作成
 *
 * @see https://trpc.io/docs/server/server-side-calls
 */
export const createCallerFactory = t.createCallerFactory;

/**
 * 3. ルーターとプロシージャ（重要な部分）
 *
 * これらはtRPC APIを構築するために使用する部品です。
 * "/src/server/api/routers"ディレクトリで頻繁にインポートすることになります。
 */

/**
 * tRPC APIで新しいルーターとサブルーターを作成する方法
 *
 * @see https://trpc.io/docs/router
 */
export const createTRPCRouter = t.router;

/**
 * プロシージャの実行時間を計測し、開発環境で人工的な遅延を追加するミドルウェア
 *
 * 不要であれば削除できますが、本番環境で発生するネットワークレイテンシーをシミュレートすることで、
 * 意図しないウォーターフォールを検出するのに役立ちます。
 */
const timingMiddleware = t.middleware(async ({ next, path }) => {
  const start = Date.now();

  if (t._config.isDev) {
    // 開発環境での人工的な遅延
    const waitMs = Math.floor(Math.random() * 400) + 100;
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }

  const result = await next();

  const end = Date.now();
  console.log(`[TRPC] ${path} took ${end - start}ms to execute`);

  return result;
});

/**
 * パブリック（認証不要）プロシージャ
 *
 * tRPC APIで新しいクエリやミューテーションを構築するための基本部品です。
 * ユーザーが認証されていることを保証しませんが、ログインしていればセッションデータに
 * アクセスできます。
 */
export const publicProcedure = t.procedure.use(timingMiddleware);

const enforceUserIsAuthed = t.middleware(async ({ ctx, next }) => {
  const session = ctx.session;
  if (!session?.user?.sub) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  return next({
    ctx: {
      ...ctx,
      // sessionをnon-nullableとして推論
      session: {
        ...session,
        user: {
          ...session.user,
          id: session.user.sub,
        },
      },
    },
  });
});

/**
 * 保護されたプロシージャ（認証必須）
 *
 * ログイン済みユーザーのみアクセス可能なプロシージャです。
 *
 * セッション情報には以下が含まれます：
 * - ctx.session.user.id: ユーザーID
 * - ctx.session.user.role: システムロール（SYSTEM_ADMIN | USER）
 *
 * @see https://trpc.io/docs/procedures
 */
export const protectedProcedure = t.procedure
  .use(timingMiddleware)
  .use(enforceUserIsAuthed);

/**
 * 管理者専用プロシージャ
 *
 * SYSTEM_ADMIN のみアクセス可能な管理系 API で使用します。
 */
export const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (ctx.session.user.role !== Role.SYSTEM_ADMIN) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "SYSTEM_ADMINのみ操作できます",
    });
  }

  // 直前のロールチェックでSYSTEM_ADMINが保証済みのため安全なキャスト。
  return next({
    ctx: ctx as AdminContext,
  });
});

export type Context = Awaited<ReturnType<typeof createTRPCContext>>;

/**
 * protectedProcedureのコンテキスト型
 * 認証済みが保証されている状態
 */
export type ProtectedContext = {
  session: NonNullable<Context["session"]>;
} & Context;

/**
 * 管理者権限が保証されているコンテキスト型
 */
export type AdminContext = ProtectedContext & {
  session: ProtectedContext["session"] & {
    user: ProtectedContext["session"]["user"] & {
      role: typeof Role.SYSTEM_ADMIN;
    };
  };
};
