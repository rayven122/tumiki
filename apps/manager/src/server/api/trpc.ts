import "server-only";

import { TRPCError, initTRPC } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import type { Prisma } from "@tumiki/db";
import type { Session } from "next-auth";

import { db } from "@tumiki/db/server";
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
    session,
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
 * 保護されたプロシージャ（認証必須）
 *
 * ログイン済みユーザーのみアクセス可能なプロシージャです。
 * 個人は会員登録時に必ず作成されるため、認証済み = 組織所属済みとなります。
 *
 * セッション情報には以下が含まれます：
 * - ctx.session.user.id: ユーザーID
 * - ctx.session.user.role: システムロール（SYSTEM_ADMIN | USER）
 * - ctx.session.user.organizationId: 組織ID（必須）
 * - ctx.session.user.organizationSlug: 組織slug（必須）
 * - ctx.session.user.isOrganizationAdmin: 組織内管理者権限
 *
 * @see https://trpc.io/docs/procedures
 */
export const protectedProcedure = t.procedure
  .use(timingMiddleware)
  .use(async ({ ctx, next }) => {
    if (!ctx.session?.user?.sub) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    if (
      !ctx.session.user.organizationId ||
      !ctx.session.user.organizationSlug
    ) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message:
          "組織への所属が必要です。先にオンボーディングを完了してください。",
      });
    }

    // 組織内での管理者権限と組織タイプを確認
    const organizationMember = await ctx.db.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          userId: ctx.session.user.sub,
          organizationId: ctx.session.user.organizationId,
        },
      },
      select: {
        isAdmin: true,
        organization: {
          select: {
            id: true,
            createdBy: true,
            isPersonal: true,
          },
        },
      },
    });

    // 組織メンバーシップの存在を保証
    if (!organizationMember?.organization) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "組織メンバーシップが見つかりません。",
      });
    }

    // 取得した組織IDとセッションの組織IDが一致することを確認
    if (
      organizationMember.organization.id !== ctx.session.user.organizationId
    ) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "組織情報が一致しません。",
      });
    }

    return next({
      ctx: {
        ...ctx,
        // sessionをnon-nullableとして推論し、組織情報も non-null として保証
        session: {
          ...ctx.session,
          user: {
            ...ctx.session.user,
            id: ctx.session.user.sub,
            organizationId: ctx.session.user.organizationId,
            organizationSlug: ctx.session.user.organizationSlug,
          },
        },
        currentOrg: {
          ...organizationMember.organization,
          isAdmin: organizationMember.isAdmin,
        },
      },
    });
  });

export type Context = Awaited<ReturnType<typeof createTRPCContext>>;

/**
 * protectedProcedureで取得する組織メンバー情報の型
 */
type OrganizationMemberWithOrg = Prisma.OrganizationMemberGetPayload<{
  select: {
    isAdmin: true;
    organization: {
      select: {
        id: true;
        createdBy: true;
        isPersonal: true;
      };
    };
  };
}>;

/**
 * currentOrgの型定義
 */
type CurrentOrg = OrganizationMemberWithOrg["organization"] & {
  isAdmin: boolean; // 現在のユーザーの管理者権限
};

/**
 * 認証済みユーザーのコンテキスト型（組織所属前でも使用可能）
 */
export type AuthenticatedContext = {
  session: NonNullable<Context["session"]>;
} & Context;

/**
 * protectedProcedureのコンテキスト型
 * 認証済みで組織所属が保証されている状態
 * ミドルウェアで組織メンバーシップの存在を検証済み
 */
export type ProtectedContext = {
  session: {
    user: Session["user"] & {
      id: string;
      organizationId: string; // 組織IDは必須
      organizationSlug: string; // 組織slugは必須
    };
  } & NonNullable<Context["session"]>;
  currentOrg: CurrentOrg; // non-null（ミドルウェアで存在を保証）
} & Context;
