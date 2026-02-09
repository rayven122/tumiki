import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { getUserOrganizations } from "./getUserOrganizations";
import {
  setDefaultOrganization,
  setDefaultOrganizationInputSchema,
  setDefaultOrganizationOutputSchema,
} from "./setDefaultOrganization";
// EE機能: 組織作成（CE版はスタブを使用）
import {
  createOrganization,
  createOrganizationInputSchema,
  createOrganizationOutputSchema,
} from "./createOrganization";
import { z } from "zod";
import { OrganizationIdSchema } from "@/schema/ids";
import { getSessionInfo } from "@/lib/auth/session-utils";

// ユーザーの組織一覧のレスポンス型
export const getUserOrganizationsOutputSchema = z.array(
  z.object({
    id: OrganizationIdSchema,
    name: z.string(),
    slug: z.string(),
    description: z.string().nullable(),
    logoUrl: z.string().nullable(),
    isDeleted: z.boolean(),
    isPersonal: z.boolean(),
    maxMembers: z.number(),
    createdBy: z.string(),
    createdAt: z.date(),
    updatedAt: z.date(),
    // isAdmin削除: JWTのrolesで判定
    memberCount: z.number(),
  }),
);

/**
 * v2 Organization Router
 *
 * 組織管理に関する API
 * - getUserOrganizations: ユーザーが所属する組織一覧を取得
 * - setDefaultOrganization: デフォルト組織を設定
 * - create: 新しい組織を作成
 */
export const organizationRouter = createTRPCRouter({
  // ユーザーの組織一覧取得
  getUserOrganizations: protectedProcedure
    .output(getUserOrganizationsOutputSchema)
    .query(async ({ ctx }) => {
      const { organizationId } = getSessionInfo(ctx.session);
      return await getUserOrganizations(ctx.db, {
        userId: ctx.session.user.id,
        currentOrganizationId: organizationId ?? undefined,
      });
    }),

  // デフォルト組織設定
  setDefaultOrganization: protectedProcedure
    .input(setDefaultOrganizationInputSchema)
    .output(setDefaultOrganizationOutputSchema)
    .mutation(async ({ ctx, input }) => {
      return await setDefaultOrganization(ctx.db, {
        userId: ctx.session.user.id,
        organizationId: input.organizationId,
      });
    }),

  // 組織作成
  create: protectedProcedure
    .input(createOrganizationInputSchema)
    .output(createOrganizationOutputSchema)
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.$transaction(async (tx) => {
        return await createOrganization(tx, {
          userId: ctx.session.user.id,
          name: input.name,
          description: input.description,
        });
      });
    }),
});
