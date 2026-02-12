import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "@/server/api/trpc";
import { getUserOrganizations } from "./getUserOrganizations";
import { updateOrganization, updateOrganizationInputSchema } from "./update";
import {
  getOrganizationById,
  getOrganizationByIdOutputSchema,
} from "./getById";
import { getUsageStats, getUsageStatsOutputSchema } from "./getUsageStats";
// EE機能: メンバー招待（CE版はスタブを使用）
import {
  inviteMembers,
  inviteMembersInputSchema,
  inviteMembersOutputSchema,
} from "./inviteMembers";
// EE機能: 招待一覧取得（CE版はスタブを使用）
import { getInvitations, getInvitationsOutputSchema } from "./getInvitations";
// EE機能: 招待再送信（CE版はスタブを使用）
import {
  resendInvitation,
  resendInvitationInputSchema,
  resendInvitationOutputSchema,
} from "./resendInvitation";
// EE機能: 招待キャンセル（CE版はスタブを使用）
import {
  cancelInvitation,
  cancelInvitationInputSchema,
  cancelInvitationOutputSchema,
} from "./cancelInvitation";
import {
  acceptInvitation,
  acceptInvitationInputSchema,
  acceptInvitationOutputSchema,
} from "./acceptInvitation";
// EE機能: メンバー削除（CE版はスタブを使用）
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
import {
  getOrganizationBySlug,
  getOrganizationBySlugInputSchema,
  getOrganizationBySlugOutputSchema,
} from "./getBySlug";
import { getDefaultOrganization } from "./getDefaultOrganization";
import {
  deleteOrganization,
  deleteOrganizationInputSchema,
  deleteOrganizationOutputSchema,
} from "./delete";
// EE機能: メンバーロール変更（CE版はスタブを使用）
import {
  updateMemberRole,
  updateMemberRoleInputSchema,
  updateMemberRoleOutputSchema,
} from "./updateMemberRole";
import {
  getMembers,
  getMembersInputSchema,
  getMembersOutputSchema,
} from "./getMembers";

import { z } from "zod";
import { OrganizationSchema } from "@tumiki/db/zod";
import { OrganizationIdSchema } from "@/schema/ids";

// ユーザーの組織一覧取得用のスキーマ（現在は入力不要）
export const GetUserOrganizationsInput = z.object({}).optional();
export const GetUserOrganizationsOutput = z.array(
  OrganizationSchema.extend({
    id: OrganizationIdSchema,
    // isAdmin削除: JWTのrolesで判定
    memberCount: z.number(),
    isDefault: z.boolean(),
  }),
);

export const organizationRouter = createTRPCRouter({
  // ユーザーの組織一覧取得
  getUserOrganizations: publicProcedure
    .output(GetUserOrganizationsOutput)
    .query(getUserOrganizations),

  // 組織更新
  update: protectedProcedure
    .input(updateOrganizationInputSchema)
    .mutation(updateOrganization),

  // 組織詳細取得
  getById: protectedProcedure
    .output(getOrganizationByIdOutputSchema)
    .query(getOrganizationById),

  // 組織メンバー一覧取得（ページネーション付き）
  getMembers: protectedProcedure
    .input(getMembersInputSchema)
    .output(getMembersOutputSchema)
    .query(getMembers),

  // 使用量統計取得
  getUsageStats: protectedProcedure
    .output(getUsageStatsOutputSchema)
    .query(getUsageStats),

  // メンバー招待（単一・複数対応）- EE機能
  inviteMembers: protectedProcedure
    .input(inviteMembersInputSchema)
    .output(inviteMembersOutputSchema)
    .mutation(inviteMembers),

  // 招待一覧取得 - EE機能
  getInvitations: protectedProcedure
    .output(getInvitationsOutputSchema)
    .query(getInvitations),

  // 招待再送信 - EE機能
  resendInvitation: protectedProcedure
    .input(resendInvitationInputSchema)
    .output(resendInvitationOutputSchema)
    .mutation(resendInvitation),

  // 招待キャンセル - EE機能
  cancelInvitation: protectedProcedure
    .input(cancelInvitationInputSchema)
    .output(cancelInvitationOutputSchema)
    .mutation(cancelInvitation),

  // 招待受け入れ
  acceptInvitation: protectedProcedure
    .input(acceptInvitationInputSchema)
    .output(acceptInvitationOutputSchema)
    .mutation(acceptInvitation),

  // メンバー削除 - EE機能
  removeMember: protectedProcedure
    .input(removeMemberInputSchema)
    .output(removeMemberOutputSchema)
    .mutation(removeMember),

  // デフォルト組織設定
  setDefaultOrganization: protectedProcedure
    .input(setDefaultOrganizationInputSchema)
    .output(setDefaultOrganizationOutputSchema)
    .mutation(setDefaultOrganization),

  // スラッグから組織取得
  getBySlug: protectedProcedure
    .input(getOrganizationBySlugInputSchema)
    .output(getOrganizationBySlugOutputSchema)
    .query(getOrganizationBySlug),

  // デフォルト組織取得
  getDefaultOrganization: protectedProcedure.query(getDefaultOrganization),

  // 組織削除
  delete: protectedProcedure
    .input(deleteOrganizationInputSchema)
    .output(deleteOrganizationOutputSchema)
    .mutation(deleteOrganization),

  // メンバーロール変更 - EE機能
  updateMemberRole: protectedProcedure
    .input(updateMemberRoleInputSchema)
    .output(updateMemberRoleOutputSchema)
    .mutation(updateMemberRole),
});
