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
  updateLeaderInputSchema,
  addMembersInputSchema,
  addMembersResultSchema,
  updateGroupInputSchema,
  groupOutputSchema,
  memberSchema,
  assignRoleToGroupInputSchema,
  removeRoleFromGroupInputSchema,
  listGroupRolesInputSchema,
  listAllGroupRolesInputSchema,
  groupRoleOutputSchema,
} from "../../../../utils/groupSchemas";
import { listGroups } from "./list";
import { createGroup } from "./create";
import { deleteGroup } from "./delete";
import { getGroupById } from "./getById";
import { addMember } from "./addMember";
import { addMembers } from "./addMembers";
import { removeMember } from "./removeMember";
import { getGroupMembers } from "./getGroupMembers";
import { moveGroup } from "./move";
import { updateLeader } from "./updateLeader";
import { updateGroup } from "./update";
import { assignRoleToGroup } from "./assignRole";
import { removeRoleFromGroup } from "./removeRole";
import { listGroupRoles } from "./listRoles";
import { listAllGroupRoles } from "./listAllRoles";
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
 * - addMembers: 複数メンバー一括追加（管理者のみ）
 * - removeMember: メンバー削除（管理者のみ）
 * - updateLeader: リーダー更新（管理者のみ）
 * - assignRole: グループにロール割り当て（管理者のみ）
 * - removeRole: グループからロール解除（管理者のみ）
 * - listRoles: グループのロール一覧取得（組織メンバー）
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

  // 複数メンバー一括追加（管理者のみ）
  addMembers: protectedProcedure
    .input(addMembersInputSchema)
    .output(addMembersResultSchema)
    .mutation(async ({ ctx, input }) => {
      return await addMembers(ctx.db, input, ctx.currentOrg);
    }),

  // リーダー更新（管理者のみ）
  updateLeader: protectedProcedure
    .input(updateLeaderInputSchema)
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      return await updateLeader(ctx.db, input, ctx.currentOrg);
    }),

  // グループ更新（管理者のみ）
  update: protectedProcedure
    .input(updateGroupInputSchema)
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      return await updateGroup(ctx.db, input, ctx.currentOrg);
    }),

  // グループにロール割り当て（管理者のみ）
  assignRole: protectedProcedure
    .input(assignRoleToGroupInputSchema)
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      return await assignRoleToGroup(ctx.db, input, ctx.currentOrg);
    }),

  // グループからロール解除（管理者のみ）
  removeRole: protectedProcedure
    .input(removeRoleFromGroupInputSchema)
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      return await removeRoleFromGroup(ctx.db, input, ctx.currentOrg);
    }),

  // グループのロール一覧取得（組織メンバー）
  listRoles: protectedProcedure
    .input(listGroupRolesInputSchema)
    .output(z.array(groupRoleOutputSchema))
    .query(async ({ ctx, input }) => {
      return await listGroupRoles(ctx.db, input, ctx.currentOrg);
    }),

  // 複数グループのロール一覧を一括取得（組織メンバー）
  listAllRoles: protectedProcedure
    .input(listAllGroupRolesInputSchema)
    .output(z.record(z.string(), z.array(groupRoleOutputSchema)))
    .query(async ({ ctx, input }) => {
      return await listAllGroupRoles(ctx.db, input, ctx.currentOrg);
    }),
});
