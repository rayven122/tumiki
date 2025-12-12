import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import {
  createUserWithOrganization,
  createUserWithOrganizationInputSchema,
  createUserWithOrganizationOutputSchema,
} from "./createUserWithOrganization";
import {
  getUserWithOrganization,
  getUserWithOrganizationInputSchema,
  getUserWithOrganizationOutputSchema,
} from "./getUserWithOrganization";
import {
  getUserPersonalOrganization,
  getUserPersonalOrganizationInputSchema,
  getUserPersonalOrganizationOutputSchema,
} from "./getUserPersonalOrganization";
import {
  getSessionAndUser,
  getSessionAndUserInputSchema,
  getSessionAndUserOutputSchema,
} from "./getSessionAndUser";

/**
 * v2 User Router
 *
 * ユーザー管理に関する API
 * - createWithOrganization: ユーザーと個人を同時作成
 * - getWithOrganization: ユーザーと組織情報を取得
 * - getPersonalOrganization: ユーザーの個人情報を取得
 * - getSessionAndUser: セッショントークンからセッションとユーザー情報を取得
 */
export const userRouter = createTRPCRouter({
  // ユーザーと個人を同時作成
  createWithOrganization: publicProcedure
    .input(createUserWithOrganizationInputSchema)
    .output(createUserWithOrganizationOutputSchema)
    .mutation(async ({ ctx, input }) => {
      return await createUserWithOrganization(ctx.db, input);
    }),

  // ユーザーと組織情報を取得
  getWithOrganization: publicProcedure
    .input(getUserWithOrganizationInputSchema)
    .output(getUserWithOrganizationOutputSchema)
    .query(async ({ ctx, input }) => {
      return await getUserWithOrganization(ctx.db, input);
    }),

  // ユーザーの個人情報を取得
  getPersonalOrganization: publicProcedure
    .input(getUserPersonalOrganizationInputSchema)
    .output(getUserPersonalOrganizationOutputSchema)
    .query(async ({ ctx, input }) => {
      return await getUserPersonalOrganization(ctx.db, input);
    }),

  // セッショントークンからセッションとユーザー情報を取得
  getSessionAndUser: publicProcedure
    .input(getSessionAndUserInputSchema)
    .output(getSessionAndUserOutputSchema)
    .query(async ({ ctx, input }) => {
      return await getSessionAndUser(ctx.db, input);
    }),
});
