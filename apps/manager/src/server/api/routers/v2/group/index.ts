import { createTRPCRouter, protectedProcedure } from "../../../trpc";
import { TRPCError } from "@trpc/server";
import { validateOrganizationAccess } from "../../../../utils/organizationPermissions";
import {
  listGroupsInputSchema,
  createGroupInputSchema,
  deleteGroupInputSchema,
  getGroupByIdInputSchema,
  addMemberInputSchema,
  removeMemberInputSchema,
  getGroupMembersInputSchema,
  groupOutputSchema,
  memberSchema,
} from "../../../../utils/groupSchemas";
import { listGroups } from "./list";
import { createGroup } from "./create";
import { deleteGroup } from "./delete";
import { getGroupById } from "./getById";
import { addMember } from "./addMember";
import { removeMember } from "./removeMember";
import { getGroupMembers } from "./getGroupMembers";
import { z } from "zod";

/**
 * v2 Group Router
 *
 * グループ管理に関する API
 * - list: グループ一覧取得（組織メンバー）
 * - getById: グループ詳細取得（組織メンバー）
 * - getMembers: グループメンバー一覧取得（組織メンバー）
 * - create: グループ作成（管理者のみ）
 * - delete: グループ削除（管理者のみ）
 * - addMember: メンバー追加（管理者のみ）
 * - removeMember: メンバー削除（管理者のみ）
 */
export const groupRouter = createTRPCRouter({
  // グループ一覧取得（組織メンバー）
  list: protectedProcedure
    .input(listGroupsInputSchema)
    .output(z.array(groupOutputSchema))
    .query(async ({ ctx, input }) => {
      // セキュリティチェック: 組織IDが現在のコンテキストと一致するか
      if (!ctx.currentOrg || ctx.currentOrg.id !== input.organizationId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "他の組織のグループにアクセスすることはできません",
        });
      }

      return await listGroups(ctx.db, input);
    }),

  // グループ詳細取得（組織メンバー）
  getById: protectedProcedure
    .input(getGroupByIdInputSchema)
    .output(groupOutputSchema)
    .query(async ({ ctx, input }) => {
      // セキュリティチェック: 組織IDが現在のコンテキストと一致するか
      if (!ctx.currentOrg || ctx.currentOrg.id !== input.organizationId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "他の組織のグループにアクセスすることはできません",
        });
      }

      return await getGroupById(ctx.db, input);
    }),

  // グループメンバー一覧取得（組織メンバー）
  getMembers: protectedProcedure
    .input(getGroupMembersInputSchema)
    .output(z.record(z.string(), z.array(memberSchema)))
    .query(async ({ ctx, input }) => {
      // セキュリティチェック: 組織IDが現在のコンテキストと一致するか
      if (!ctx.currentOrg || ctx.currentOrg.id !== input.organizationId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "他の組織のグループメンバーにアクセスすることはできません",
        });
      }

      return await getGroupMembers(ctx.db, input);
    }),

  // グループ作成（管理者のみ）
  create: protectedProcedure
    .input(createGroupInputSchema)
    .output(z.object({ id: z.string(), name: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // セキュリティチェック1: 組織IDが現在のコンテキストと一致するか
      if (!ctx.currentOrg || ctx.currentOrg.id !== input.organizationId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "他の組織にグループを作成することはできません",
        });
      }

      // セキュリティチェック2: グループ管理権限を検証
      validateOrganizationAccess(ctx.currentOrg, {
        requirePermission: "group:manage",
      });

      return await createGroup(ctx.db, input);
    }),

  // グループ削除（管理者のみ）
  delete: protectedProcedure
    .input(deleteGroupInputSchema)
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      // セキュリティチェック1: 組織IDが現在のコンテキストと一致するか
      if (!ctx.currentOrg || ctx.currentOrg.id !== input.organizationId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "他の組織のグループを削除することはできません",
        });
      }

      // セキュリティチェック2: グループ管理権限を検証
      validateOrganizationAccess(ctx.currentOrg, {
        requirePermission: "group:manage",
      });

      return await deleteGroup(ctx.db, input);
    }),

  // メンバー追加（管理者のみ）
  addMember: protectedProcedure
    .input(addMemberInputSchema)
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      // セキュリティチェック1: 組織IDが現在のコンテキストと一致するか
      if (!ctx.currentOrg || ctx.currentOrg.id !== input.organizationId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "他の組織のグループにメンバーを追加することはできません",
        });
      }

      // セキュリティチェック2: グループ管理権限を検証
      validateOrganizationAccess(ctx.currentOrg, {
        requirePermission: "group:manage",
      });

      return await addMember(ctx.db, input);
    }),

  // メンバー削除（管理者のみ）
  removeMember: protectedProcedure
    .input(removeMemberInputSchema)
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      // セキュリティチェック1: 組織IDが現在のコンテキストと一致するか
      if (!ctx.currentOrg || ctx.currentOrg.id !== input.organizationId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "他の組織のグループからメンバーを削除することはできません",
        });
      }

      // セキュリティチェック2: グループ管理権限を検証
      validateOrganizationAccess(ctx.currentOrg, {
        requirePermission: "group:manage",
      });

      return await removeMember(ctx.db, input);
    }),
});
