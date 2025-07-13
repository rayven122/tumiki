import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { getUserOrganizations } from "./getUserOrganizations";
import { createOrganization, createOrganizationInputSchema } from "./create";
import { updateOrganization, updateOrganizationInputSchema } from "./update";
import { deleteOrganization, deleteOrganizationInputSchema } from "./delete";
import { restoreOrganization, restoreOrganizationInputSchema } from "./restore";
import { getOrganizationById, getOrganizationByIdInputSchema } from "./getById";

import { z } from "zod";

// ユーザーの組織一覧取得用のスキーマ（現在は入力不要）
export const GetUserOrganizationsInput = z.object({}).optional();
export const organizationRouter = createTRPCRouter({
  // ユーザーの組織一覧取得
  getUserOrganizations: protectedProcedure
    .input(GetUserOrganizationsInput)
    .query(getUserOrganizations),

  // 組織作成
  create: protectedProcedure
    .input(createOrganizationInputSchema)
    .mutation(createOrganization),

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
    .query(getOrganizationById),
});
