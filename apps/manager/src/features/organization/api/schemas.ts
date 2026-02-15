/**
 * Organization API スキーマ定義
 *
 * organization routerで使用される共通スキーマ
 */
import { z } from "zod";
import { OrganizationIdSchema } from "@/schema/ids";

/**
 * ユーザーの組織一覧取得用の入力スキーマ（publicProcedure用）
 */
export const getUserOrganizationsInputSchema = z.object({}).optional();

/**
 * ユーザーの組織一覧取得用の出力スキーマ（publicProcedure用）
 * Slackフィールドは除外（機密情報のため）
 */
export const getUserOrganizationsOutputSchema = z.array(
  z.object({
    id: OrganizationIdSchema,
    name: z.string(),
    slug: z.string(),
    description: z.string().nullable(),
    logoUrl: z.string().nullable(),
    isDeleted: z.boolean(),
    isPersonal: z.boolean(),
    maxMembers: z.number(),
    createdBy: z.string(),
    createdAt: z.date(),
    updatedAt: z.date(),
    memberCount: z.number(),
    isDefault: z.boolean(),
  }),
);

/**
 * ユーザーの組織一覧取得用の出力スキーマ（protectedProcedure用）
 */
export const getUserOrganizationsProtectedOutputSchema = z.array(
  z.object({
    id: OrganizationIdSchema,
    name: z.string(),
    slug: z.string(),
    description: z.string().nullable(),
    logoUrl: z.string().nullable(),
    isDeleted: z.boolean(),
    isPersonal: z.boolean(),
    maxMembers: z.number(),
    createdBy: z.string(),
    createdAt: z.date(),
    updatedAt: z.date(),
    memberCount: z.number(),
  }),
);

export type GetUserOrganizationsInput = z.infer<
  typeof getUserOrganizationsInputSchema
>;
export type GetUserOrganizationsOutput = z.infer<
  typeof getUserOrganizationsOutputSchema
>;
export type GetUserOrganizationsProtectedOutput = z.infer<
  typeof getUserOrganizationsProtectedOutputSchema
>;
