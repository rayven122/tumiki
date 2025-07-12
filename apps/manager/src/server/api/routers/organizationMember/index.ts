import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { z } from "zod";

import { getByOrganization } from "./getByOrganization";
import { addMember } from "./add";
import { removeMember } from "./remove";
import { toggleAdmin } from "./toggleAdmin";
import { updateRole } from "./updateRole";
import { bulkUpdate } from "./bulkUpdate";

// スキーマ定義
export const GetByOrganizationInput = z.object({
  organizationId: z.string().min(1, "組織IDが必要です"),
  search: z.string().optional(),
  roles: z.array(z.string()).optional(),
  groups: z.array(z.string()).optional(),
  isAdmin: z.boolean().optional(),
});

export const AddMemberInput = z.object({
  organizationId: z.string().min(1, "組織IDが必要です"),
  userId: z.string().min(1, "ユーザーIDが必要です"),
  isAdmin: z.boolean().default(false),
  roleIds: z.array(z.string()).default([]),
  groupIds: z.array(z.string()).default([]),
});

export const RemoveMemberInput = z.object({
  organizationId: z.string().min(1, "組織IDが必要です"),
  memberId: z.string().min(1, "メンバーIDが必要です"),
});

export const ToggleAdminInput = z.object({
  organizationId: z.string().min(1, "組織IDが必要です"),
  memberId: z.string().min(1, "メンバーIDが必要です"),
});

export const UpdateRoleInput = z.object({
  organizationId: z.string().min(1, "組織IDが必要です"),
  memberId: z.string().min(1, "メンバーIDが必要です"),
  roleIds: z.array(z.string()).optional(),
  groupIds: z.array(z.string()).optional(),
});

export const BulkUpdateInput = z.object({
  organizationId: z.string().min(1, "組織IDが必要です"),
  memberIds: z.array(z.string()).min(1, "最低1つのメンバーIDが必要です"),
  action: z.enum(["DELETE", "UPDATE_ROLES", "UPDATE_GROUPS", "UPDATE_ADMIN"], {
    errorMap: () => ({ message: "無効な操作です" }),
  }),
  roleIds: z.array(z.string()).optional(),
  groupIds: z.array(z.string()).optional(),
  isAdmin: z.boolean().optional(),
});

export const organizationMemberRouter = createTRPCRouter({
  // メンバー一覧取得
  getByOrganization: protectedProcedure
    .input(GetByOrganizationInput)
    .query(getByOrganization),

  // メンバー追加
  add: protectedProcedure
    .input(AddMemberInput)
    .mutation(addMember),

  // メンバー削除
  remove: protectedProcedure
    .input(RemoveMemberInput)
    .mutation(removeMember),

  // 管理者権限付与/剥奪
  toggleAdmin: protectedProcedure
    .input(ToggleAdminInput)
    .mutation(toggleAdmin),

  // メンバーロール更新
  updateRole: protectedProcedure
    .input(UpdateRoleInput)
    .mutation(updateRole),

  // 一括操作
  bulkUpdate: protectedProcedure
    .input(BulkUpdateInput)
    .mutation(bulkUpdate),
});