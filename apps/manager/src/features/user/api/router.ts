import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import {
  getUserWithOrganization,
  getUserWithOrganizationInputSchema,
  getUserWithOrganizationOutputSchema,
} from "./getUserWithOrganization";
import {
  getSessionAndUser,
  getSessionAndUserInputSchema,
  getSessionAndUserOutputSchema,
} from "./getSessionAndUser";

/**
 * User Router
 *
 * ユーザー管理に関する API
 * - getWithOrganization: ユーザーと組織情報を取得
 * - getSessionAndUser: セッショントークンからセッションとユーザー情報を取得
 */
export const userRouter = createTRPCRouter({
  // ユーザーと組織情報を取得
  getWithOrganization: publicProcedure
    .input(getUserWithOrganizationInputSchema)
    .output(getUserWithOrganizationOutputSchema)
    .query(async ({ ctx, input }) => {
      return await getUserWithOrganization(ctx.db, input);
    }),

  // セッショントークンからセッションとユーザー情報を取得
  getSessionAndUser: publicProcedure
    .input(getSessionAndUserInputSchema)
    .output(getSessionAndUserOutputSchema)
    .query(async ({ ctx, input }) => {
      return await getSessionAndUser(ctx.db, input);
    }),
});
