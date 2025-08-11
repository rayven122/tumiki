import "server-only";

/**
 * このファイルを編集する必要があるのは以下の場合のみです：
 * 1. リクエストコンテキストを変更したい場合（パート1参照）
 * 2. 新しいミドルウェアやプロシージャタイプを作成したい場合（パート3参照）
 *
 * 要約：ここはtRPCサーバーの全機能が作成・接続される場所です。
 * 使用する必要がある部分は最後の方に文書化されています。
 */

import { TRPCError, initTRPC } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";

import { auth } from "@tumiki/auth/server";
import { db } from "@tumiki/db/server";

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

  // ユーザーの現在の組織を取得
  let currentOrganizationId: string | null = null;

  if (session?.user?.sub) {
    // まずユーザーのdefaultOrganizationIdをチェック
    const user = await db.user.findUnique({
      where: { id: session.user.sub },
      select: { defaultOrganizationId: true },
    });

    if (user?.defaultOrganizationId) {
      // defaultOrganizationIdが設定されている場合は優先使用

      currentOrganizationId = user.defaultOrganizationId;
    } else {
      // フォールバック：個人組織を検索
      const firstMembership = await db.organizationMember.findFirst({
        where: {
          userId: session.user.sub,
          organization: {
            isDeleted: false,
          },
        },
        orderBy: {
          organization: {
            isPersonal: "desc", // 個人組織を優先
          },
        },
        select: {
          organizationId: true,
        },
      });

      if (firstMembership?.organizationId) {
        currentOrganizationId = firstMembership.organizationId;

        // 見つかった個人組織をdefaultOrganizationIdに設定
        try {
          await db.user.update({
            where: { id: session.user.sub },
            data: { defaultOrganizationId: firstMembership.organizationId },
          });
        } catch (error) {
          // 更新に失敗してもログイン処理は継続
          console.warn("Failed to update defaultOrganizationId:", error);
        }
      } else {
        currentOrganizationId = null;
      }
    }
  }

  return {
    db,
    session,
    currentOrganizationId,
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
  errorFormatter({ shape, error }) {
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

/**
 * 認証済みプロシージャ（組織不要）
 *
 * 認証は必要だが組織コンテキストが不要なプロシージャで使用します。
 * オンボーディングフローなど、まだ組織を持っていないユーザー向けの処理に便利です。
 */
export const authenticatedProcedure = t.procedure
  .use(timingMiddleware)
  .use(({ ctx, next }) => {
    if (!ctx.session?.user?.sub) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    return next({
      ctx: {
        // sessionをnon-nullableとして推論
        session: {
          ...ctx.session,
          user: { ...ctx.session.user, id: ctx.session.user.sub },
        },
        currentOrganizationId: ctx.currentOrganizationId, // nullの可能性あり
      },
    });
  });

/**
 * 保護されたプロシージャ（認証と組織が必須）
 *
 * ログイン済みかつ組織に所属しているユーザーのみアクセス可能にしたい場合に使用します。
 * セッションが有効であることを検証し、`ctx.session.user`と`ctx.currentOrganizationId`がnullでないことを保証します。
 *
 * @see https://trpc.io/docs/procedures
 */
export const protectedProcedure = authenticatedProcedure.use(
  ({ ctx, next }) => {
    if (!ctx.currentOrganizationId) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message:
          "組織への所属が必要です。先にオンボーディングを完了してください。",
      });
    }

    return next({
      ctx: {
        ...ctx,
        // 型の絞り込み: currentOrganizationIdがnon-nullであることを保証
        currentOrganizationId: ctx.currentOrganizationId,
      },
    });
  },
);

export type Context = Awaited<ReturnType<typeof createTRPCContext>>;

export type AuthenticatedContext = {
  session: {
    user: {
      id: string;
    };
  } & NonNullable<Context["session"]>;
  currentOrganizationId: string | null; // 組織IDはnullの可能性がある
} & Context;

// protectedProcedureの第一引数を型抽出する
export type ProtectedContext = {
  session: {
    user: {
      id: string;
    };
  } & NonNullable<Context["session"]>;
  currentOrganizationId: string; // 組織IDは必須
} & Context;
