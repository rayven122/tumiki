import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import {
  CreateAccessRuleInput,
  UpdateAccessRuleInput,
  DeleteAccessRuleInput,
  GetByResourceInput,
  CheckAccessInput,
  TestPermissionInput,
} from "./schemas";
import { createRule } from "./createRule";
import { updateRule } from "./updateRule";
import { deleteRule } from "./deleteRule";
import { getByResource } from "./getByResource";
import { checkAccess } from "./checkAccess";
import { testPermission } from "./testPermission";

export const resourceAccessControlRouter = createTRPCRouter({
  // アクセス制御ルール作成
  createRule: protectedProcedure
    .input(CreateAccessRuleInput)
    .mutation(createRule),

  // アクセス制御ルール更新
  updateRule: protectedProcedure
    .input(UpdateAccessRuleInput)
    .mutation(updateRule),

  // アクセス制御ルール削除
  deleteRule: protectedProcedure
    .input(DeleteAccessRuleInput)
    .mutation(deleteRule),

  // リソース別アクセス制御一覧取得
  getByResource: protectedProcedure
    .input(GetByResourceInput)
    .query(getByResource),

  // 権限チェック
  checkAccess: protectedProcedure
    .input(CheckAccessInput)
    .query(checkAccess),

  // 権限テスト
  testPermission: protectedProcedure
    .input(TestPermissionInput)
    .query(testPermission),
});