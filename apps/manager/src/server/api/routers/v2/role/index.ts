import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
// EE機能: ロール作成（CE版はスタブを使用）
import {
  createRole,
  createRoleInputSchema,
  createRoleOutputSchema,
} from "./create";
import { listRoles, listRolesInputSchema, listRolesOutputSchema } from "./list";
import { getRole, getRoleInputSchema, getRoleOutputSchema } from "./get";
// EE機能: ロール更新（CE版はスタブを使用）
import {
  updateRole,
  updateRoleInputSchema,
  updateRoleOutputSchema,
} from "./update";
// EE機能: ロール削除（CE版はスタブを使用）
import {
  deleteRole,
  deleteRoleInputSchema,
  deleteRoleOutputSchema,
} from "./delete";
// EE機能: 権限追加（CE版はスタブを使用）
import {
  addPermission,
  addPermissionInputSchema,
  addPermissionOutputSchema,
} from "./addPermission";
// EE機能: 権限削除（CE版はスタブを使用）
import {
  removePermission,
  removePermissionInputSchema,
  removePermissionOutputSchema,
} from "./removePermission";

/**
 * v2 Role Router
 *
 * カスタムロール管理に関する API
 * - list: ロール一覧取得（組織メンバー）
 * - get: ロール詳細取得（組織メンバー）
 * - create: ロール作成（role:manage権限、チーム必須）【EE機能】
 * - update: ロール更新（role:manage権限、チーム必須）【EE機能】
 * - delete: ロール削除（role:manage権限、チーム必須）【EE機能】
 * - addPermission: 権限追加（role:manage権限、チーム必須）【EE機能】
 * - removePermission: 権限削除（role:manage権限、チーム必須）【EE機能】
 *
 * 注意:
 * - protectedProcedureで組織所属が保証されているため、ctx.currentOrgは常に存在する
 * - 権限チェックは各関数内で実行される
 * - 書き込み系API（create/update/delete/addPermission/removePermission）はEE機能
 */
export const roleRouter = createTRPCRouter({
  list: protectedProcedure
    .input(listRolesInputSchema)
    .output(listRolesOutputSchema)
    .query(async ({ input, ctx }) => listRoles({ input, ctx })),

  get: protectedProcedure
    .input(getRoleInputSchema)
    .output(getRoleOutputSchema)
    .query(async ({ input, ctx }) => getRole({ input, ctx })),

  create: protectedProcedure
    .input(createRoleInputSchema)
    .output(createRoleOutputSchema)
    .mutation(async ({ input, ctx }) => createRole({ input, ctx })),

  update: protectedProcedure
    .input(updateRoleInputSchema)
    .output(updateRoleOutputSchema)
    .mutation(async ({ input, ctx }) => updateRole({ input, ctx })),

  delete: protectedProcedure
    .input(deleteRoleInputSchema)
    .output(deleteRoleOutputSchema)
    .mutation(async ({ input, ctx }) => deleteRole({ input, ctx })),

  addPermission: protectedProcedure
    .input(addPermissionInputSchema)
    .output(addPermissionOutputSchema)
    .mutation(async ({ input, ctx }) => addPermission({ input, ctx })),

  removePermission: protectedProcedure
    .input(removePermissionInputSchema)
    .output(removePermissionOutputSchema)
    .mutation(async ({ input, ctx }) => removePermission({ input, ctx })),
});
