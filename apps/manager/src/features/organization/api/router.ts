import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "@/server/api/trpc";
import { getSessionInfo } from "@/lib/auth/session-utils";

// スキーマ定義
import {
  getUserOrganizationsOutputSchema,
  getUserOrganizationsProtectedOutputSchema,
} from "./schemas";

// エンドポイント関数のインポート
import { getUserOrganizations } from "./getUserOrganizations";
import { getUserOrganizationsProtected } from "./getUserOrganizationsProtected";
import {
  getOrganizationById,
  getOrganizationByIdOutputSchema,
} from "./getById";
import {
  getOrganizationBySlug,
  getOrganizationBySlugInputSchema,
  getOrganizationBySlugOutputSchema,
} from "./getBySlug";
import { getDefaultOrganization } from "./getDefaultOrganization";
import {
  getMembers,
  getMembersInputSchema,
  getMembersOutputSchema,
} from "./getMembers";
import { getUsageStats, getUsageStatsOutputSchema } from "./getUsageStats";
import { updateOrganization, updateOrganizationInputSchema } from "./update";
import {
  deleteOrganization,
  deleteOrganizationInputSchema,
  deleteOrganizationOutputSchema,
} from "./delete";
import {
  setDefaultOrganization,
  setDefaultOrganizationInputSchema,
  setDefaultOrganizationOutputSchema,
} from "./setDefaultOrganization";
import {
  acceptInvitation,
  acceptInvitationInputSchema,
  acceptInvitationOutputSchema,
} from "./acceptInvitation";
// EE機能: 組織作成（CE版ビルド時はwebpackが.tsにリダイレクト）
import {
  createOrganization,
  createOrganizationInputSchema,
  createOrganizationOutputSchema,
} from "./createOrganization.ee";
// EE機能: 招待一覧取得（CE版ビルド時はwebpackが.tsにリダイレクト）
import {
  getInvitations,
  getInvitationsOutputSchema,
} from "./getInvitations.ee";
// EE機能: メンバー招待（CE版ビルド時はwebpackが.tsにリダイレクト）
import {
  inviteMembers,
  inviteMembersInputSchema,
  inviteMembersOutputSchema,
} from "./inviteMembers.ee";
// EE機能: 招待再送信（CE版ビルド時はwebpackが.tsにリダイレクト）
import {
  resendInvitation,
  resendInvitationInputSchema,
  resendInvitationOutputSchema,
} from "./resendInvitation.ee";
// EE機能: 招待キャンセル（CE版ビルド時はwebpackが.tsにリダイレクト）
import {
  cancelInvitation,
  cancelInvitationInputSchema,
  cancelInvitationOutputSchema,
} from "./cancelInvitation.ee";
// EE機能: メンバー削除（CE版ビルド時はwebpackが.tsにリダイレクト）
import {
  removeMember,
  removeMemberInputSchema,
  removeMemberOutputSchema,
} from "./removeMember.ee";
// EE機能: メンバーロール変更（CE版ビルド時はwebpackが.tsにリダイレクト）
import {
  updateMemberRole,
  updateMemberRoleInputSchema,
  updateMemberRoleOutputSchema,
} from "./updateMemberRole.ee";

/**
 * Organization Router
 *
 * 組織管理に関する API（v1とv2を統合）
 */
export const organizationRouter = createTRPCRouter({
  // ユーザーの組織一覧取得（publicProcedure - v1互換）
  getUserOrganizations: publicProcedure
    .output(getUserOrganizationsOutputSchema)
    .query(getUserOrganizations),

  // ユーザーの組織一覧取得（protectedProcedure - v2）
  getUserOrganizationsProtected: protectedProcedure
    .output(getUserOrganizationsProtectedOutputSchema)
    .query(async ({ ctx }) => {
      const { organizationId } = getSessionInfo(ctx.session);
      return await getUserOrganizationsProtected(ctx.db, {
        userId: ctx.session.user.id,
        currentOrganizationId: organizationId ?? undefined,
      });
    }),

  // 組織詳細取得
  getById: protectedProcedure
    .output(getOrganizationByIdOutputSchema)
    .query(getOrganizationById),

  // スラッグから組織取得
  getBySlug: protectedProcedure
    .input(getOrganizationBySlugInputSchema)
    .output(getOrganizationBySlugOutputSchema)
    .query(getOrganizationBySlug),

  // デフォルト組織取得
  getDefaultOrganization: protectedProcedure.query(getDefaultOrganization),

  // 組織メンバー一覧取得（ページネーション付き）
  getMembers: protectedProcedure
    .input(getMembersInputSchema)
    .output(getMembersOutputSchema)
    .query(getMembers),

  // 使用量統計取得
  getUsageStats: protectedProcedure
    .output(getUsageStatsOutputSchema)
    .query(getUsageStats),

  // 組織更新
  update: protectedProcedure
    .input(updateOrganizationInputSchema)
    .mutation(updateOrganization),

  // 組織削除
  delete: protectedProcedure
    .input(deleteOrganizationInputSchema)
    .output(deleteOrganizationOutputSchema)
    .mutation(deleteOrganization),

  // デフォルト組織設定（v2実装: DB更新あり）
  setDefaultOrganization: protectedProcedure
    .input(setDefaultOrganizationInputSchema)
    .output(setDefaultOrganizationOutputSchema)
    .mutation(async ({ ctx, input }) => {
      return await setDefaultOrganization(ctx.db, {
        userId: ctx.session.user.id,
        organizationId: input.organizationId,
      });
    }),

  // 招待受け入れ
  acceptInvitation: protectedProcedure
    .input(acceptInvitationInputSchema)
    .output(acceptInvitationOutputSchema)
    .mutation(acceptInvitation),

  // 組織作成 - EE機能
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

  // 招待一覧取得 - EE機能
  getInvitations: protectedProcedure
    .output(getInvitationsOutputSchema)
    .query(getInvitations),

  // メンバー招待（単一・複数対応）- EE機能
  inviteMembers: protectedProcedure
    .input(inviteMembersInputSchema)
    .output(inviteMembersOutputSchema)
    .mutation(inviteMembers),

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

  // メンバー削除 - EE機能
  removeMember: protectedProcedure
    .input(removeMemberInputSchema)
    .output(removeMemberOutputSchema)
    .mutation(removeMember),

  // メンバーロール変更 - EE機能
  updateMemberRole: protectedProcedure
    .input(updateMemberRoleInputSchema)
    .output(updateMemberRoleOutputSchema)
    .mutation(updateMemberRole),
});
