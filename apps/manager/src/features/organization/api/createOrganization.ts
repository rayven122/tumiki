import type { PrismaTransactionClient } from "@tumiki/db";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

// スキーマはそのまま維持（型互換性のため）
export const createOrganizationInputSchema = z.object({
  name: z
    .string()
    .min(1, "組織名は必須です")
    .max(100, "組織名は100文字以内で入力してください"),
  description: z.string().optional().nullable(),
});

export const createOrganizationOutputSchema = z.object({
  id: z.string(),
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
});

type CreateOrganizationInput = {
  userId: string;
  name: string;
  description?: string | null;
};

/**
 * 組織作成（CE版スタブ）
 * CE版では利用不可
 */
export const createOrganization = async (
  _tx: PrismaTransactionClient,
  _input: CreateOrganizationInput,
): Promise<z.infer<typeof createOrganizationOutputSchema>> => {
  throw new TRPCError({
    code: "FORBIDDEN",
    message: "組織作成機能はEnterprise Editionでのみ利用可能です",
  });
};
