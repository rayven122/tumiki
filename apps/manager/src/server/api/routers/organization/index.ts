import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { getUserOrganizations } from "./getUserOrganizations";

import { z } from "zod";

// ユーザーの組織一覧取得用のスキーマ（現在は入力不要）
export const GetUserOrganizationsInput = z.object({}).optional();
export const organizationRouter = createTRPCRouter({
  // ユーザーの組織一覧取得
  getUserOrganizations: protectedProcedure
    .input(GetUserOrganizationsInput)
    .query(getUserOrganizations),
});
