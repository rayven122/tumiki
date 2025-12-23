import { createTRPCRouter, protectedProcedure } from "../../../trpc";
import {
  listGroupsInputSchema,
  createGroupInputSchema,
  deleteGroupInputSchema,
  getGroupByIdInputSchema,
  addMemberInputSchema,
  removeMemberInputSchema,
  getGroupMembersInputSchema,
  moveGroupInputSchema,
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
import { moveGroup } from "./move";
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
 * - move: グループ移動（管理者のみ）
 * - addMember: メンバー追加（管理者のみ）
 * - removeMember: メンバー削除（管理者のみ）
 *
 * セキュリティチェックは各ハンドラ関数内で行われます
 */
export const groupRouter = createTRPCRouter({
  // グループ一覧取得（組織メンバー）
  list: protectedProcedure
    .input(listGroupsInputSchema)
    .output(z.array(groupOutputSchema))
    .query(async ({ ctx, input }) => {
      return await listGroups(ctx.db, input, ctx.currentOrg);
    }),

  // グループ詳細取得（組織メンバー）
  getById: protectedProcedure
    .input(getGroupByIdInputSchema)
    .output(groupOutputSchema)
    .query(async ({ ctx, input }) => {
      return await getGroupById(ctx.db, input, ctx.currentOrg);
    }),

  // グループメンバー一覧取得（組織メンバー）
  getMembers: protectedProcedure
    .input(getGroupMembersInputSchema)
    .output(z.record(z.string(), z.array(memberSchema)))
    .query(async ({ ctx, input }) => {
      return await getGroupMembers(ctx.db, input, ctx.currentOrg);
    }),

  // グループ作成（管理者のみ）
  create: protectedProcedure
    .input(createGroupInputSchema)
    .output(z.object({ id: z.string(), name: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return await createGroup(ctx.db, input, ctx.currentOrg);
    }),

  // グループ削除（管理者のみ）
  delete: protectedProcedure
    .input(deleteGroupInputSchema)
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      return await deleteGroup(ctx.db, input, ctx.currentOrg);
    }),

  // グループ移動（管理者のみ）
  move: protectedProcedure
    .input(moveGroupInputSchema)
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      return await moveGroup(ctx.db, input, ctx.currentOrg);
    }),

  // メンバー追加（管理者のみ）
  addMember: protectedProcedure
    .input(addMemberInputSchema)
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      return await addMember(ctx.db, input, ctx.currentOrg);
    }),

  // メンバー削除（管理者のみ）
  removeMember: protectedProcedure
    .input(removeMemberInputSchema)
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      return await removeMember(ctx.db, input, ctx.currentOrg);
    }),
});
