import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { createRole } from "./create";
import { updateRole } from "./update";
import { deleteRole } from "./delete";
import { getRolesByOrganization } from "./getByOrganization";
import { updatePermissions } from "./updatePermissions";
import { setDefaultRole } from "./setDefault";
import {
  CreateRoleInput,
  UpdateRoleInput,
  DeleteRoleInput,
  GetRolesByOrganizationInput,
  UpdatePermissionsInput,
  SetDefaultRoleInput,
} from "./schemas";

export const organizationRoleRouter = createTRPCRouter({
  // ロール作成
  create: protectedProcedure.input(CreateRoleInput).mutation(createRole),

  // ロール更新
  update: protectedProcedure.input(UpdateRoleInput).mutation(updateRole),

  // ロール削除
  delete: protectedProcedure.input(DeleteRoleInput).mutation(deleteRole),

  // 組織のロール一覧取得
  getByOrganization: protectedProcedure
    .input(GetRolesByOrganizationInput)
    .query(getRolesByOrganization),

  // 権限設定更新
  updatePermissions: protectedProcedure
    .input(UpdatePermissionsInput)
    .mutation(updatePermissions),

  // デフォルトロール設定
  setDefault: protectedProcedure
    .input(SetDefaultRoleInput)
    .mutation(setDefaultRole),
});