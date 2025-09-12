import {
  authenticatedProcedure,
  createTRPCRouter,
  protectedProcedure,
} from "@/server/api/trpc";
import { getUserOrganizations } from "./getUserOrganizations";
import { createOrganization, createOrganizationInputSchema } from "./create";
import { createPersonalOrganization } from "./createPersonalOrganization";
import { updateOrganization, updateOrganizationInputSchema } from "./update";
import { deleteOrganization, deleteOrganizationInputSchema } from "./delete";
import { restoreOrganization, restoreOrganizationInputSchema } from "./restore";
import {
  getOrganizationById,
  getOrganizationByIdInputSchema,
  getOrganizationByIdOutputSchema,
} from "./getById";
import {
  getUsageStats,
  getUsageStatsInputSchema,
  getUsageStatsOutputSchema,
} from "./getUsageStats";
import {
  inviteMember,
  inviteMemberInputSchema,
  inviteMemberOutputSchema,
} from "./inviteMember";
import { getInvitations, getInvitationsOutputSchema } from "./getInvitations";
import {
  resendInvitation,
  resendInvitationInputSchema,
  resendInvitationOutputSchema,
} from "./resendInvitation";
import {
  cancelInvitation,
  cancelInvitationInputSchema,
  cancelInvitationOutputSchema,
} from "./cancelInvitation";
import {
  removeMember,
  removeMemberInputSchema,
  removeMemberOutputSchema,
} from "./removeMember";
import {
  setDefaultOrganization,
  setDefaultOrganizationInputSchema,
  setDefaultOrganizationOutputSchema,
} from "./setDefaultOrganization";

import { z } from "zod";
import { OrganizationSchema } from "@tumiki/db/zod";
import { OrganizationIdSchema } from "@/schema/ids";

// ユーザーの組織一覧取得用のスキーマ（現在は入力不要）
export const GetUserOrganizationsInput = z.object({}).optional();
export const GetUserOrganizationsOutput = z.array(
  OrganizationSchema.extend({
    id: OrganizationIdSchema,
    isAdmin: z.boolean(),
    memberCount: z.number(),
    isDefault: z.boolean(),
  }),
);

export const organizationRouter = createTRPCRouter({
  // ユーザーの組織一覧取得
  getUserOrganizations: protectedProcedure
    .output(GetUserOrganizationsOutput)
    .query(getUserOrganizations),

  // 組織作成
  create: authenticatedProcedure
    .input(createOrganizationInputSchema)
    .mutation(createOrganization),

  // 個人組織作成（オンボーディング用）
  createPersonalOrganization: authenticatedProcedure.mutation(
    createPersonalOrganization,
  ),

  // 組織更新
  update: protectedProcedure
    .input(updateOrganizationInputSchema)
    .mutation(updateOrganization),

  // 組織削除（論理削除）
  delete: protectedProcedure
    .input(deleteOrganizationInputSchema)
    .mutation(deleteOrganization),

  // 組織復元
  restore: protectedProcedure
    .input(restoreOrganizationInputSchema)
    .mutation(restoreOrganization),

  // 組織詳細取得
  getById: protectedProcedure
    .input(getOrganizationByIdInputSchema)
    .output(getOrganizationByIdOutputSchema)
    .query(getOrganizationById),

  // 使用量統計取得
  getUsageStats: protectedProcedure
    .input(getUsageStatsInputSchema)
    .output(getUsageStatsOutputSchema)
    .query(getUsageStats),

  // メンバー招待
  inviteMember: protectedProcedure
    .input(inviteMemberInputSchema)
    .output(inviteMemberOutputSchema)
    .mutation(inviteMember),

  // 招待一覧取得
  getInvitations: protectedProcedure
    .output(getInvitationsOutputSchema)
    .query(getInvitations),

  // 招待再送信
  resendInvitation: protectedProcedure
    .input(resendInvitationInputSchema)
    .output(resendInvitationOutputSchema)
    .mutation(resendInvitation),

  // 招待キャンセル
  cancelInvitation: protectedProcedure
    .input(cancelInvitationInputSchema)
    .output(cancelInvitationOutputSchema)
    .mutation(cancelInvitation),

  // メンバー削除
  removeMember: protectedProcedure
    .input(removeMemberInputSchema)
    .output(removeMemberOutputSchema)
    .mutation(removeMember),

  // デフォルト組織設定
  setDefaultOrganization: protectedProcedure
    .input(setDefaultOrganizationInputSchema)
    .output(setDefaultOrganizationOutputSchema)
    .mutation(setDefaultOrganization),
});
