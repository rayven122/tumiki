import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { getUserOrganizations } from "./getUserOrganizations";
import {
  setDefaultOrganization,
  setDefaultOrganizationInputSchema,
  setDefaultOrganizationOutputSchema,
} from "./setDefaultOrganization";
import { z } from "zod";
import { OrganizationIdSchema } from "@/schema/ids";

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
    isAdmin: z.boolean(),
    memberCount: z.number(),
    isDefault: z.boolean(),
  }),
);

/**
 * v2 Organization Router
 *
 * 組織管理に関する API
 * - getUserOrganizations: ユーザーが所属する組織一覧を取得
 * - setDefaultOrganization: デフォルト組織を設定
 */
export const organizationRouter = createTRPCRouter({
  // ユーザーの組織一覧取得
  getUserOrganizations: protectedProcedure
    .output(getUserOrganizationsOutputSchema)
    .query(async ({ ctx }) => {
      return await getUserOrganizations(ctx.db, {
        userId: ctx.session.user.id,
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
});
