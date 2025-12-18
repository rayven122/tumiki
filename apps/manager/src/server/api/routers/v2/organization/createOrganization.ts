import type { PrismaTransactionClient } from "@tumiki/db";
import { generateUniqueSlug } from "@tumiki/db/utils/slug";
import { createId } from "@paralleldrive/cuid2";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

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
 * 組織を作成
 *
 * @param tx Prismaトランザクションクライアント
 * @param input 作成データ
 * @returns 作成された組織情報
 */
export const createOrganization = async (
  tx: PrismaTransactionClient,
  input: CreateOrganizationInput,
) => {
  const { userId, name, description } = input;

  // 既存組織の重複チェック
  const existingOrg = await tx.organization.findFirst({
    where: {
      name,
      createdBy: userId,
      isDeleted: false,
    },
  });

  if (existingOrg) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "同じ名前の組織が既に存在します",
    });
  }

  // ユニークなslugを生成
  const slug = await generateUniqueSlug(tx, name, false);

  // 組織を作成
  // 注: 現在のスキーマではidを手動指定する必要がある（Week 2でスキーマ修正が必要）
  const organizationId = createId();

  const organization = await tx.organization.create({
    data: {
      id: organizationId,
      name,
      slug,
      description: description ?? null,
      logoUrl: null,
      createdBy: userId,
      isPersonal: false,
      maxMembers: 10, // デフォルトの最大メンバー数
      members: {
        create: {
          userId,
        },
      },
    },
  });

  // ユーザーのdefaultOrganizationSlugを設定
  await tx.user.update({
    where: { id: userId },
    data: {
      defaultOrganizationSlug: organization.slug,
    },
  });

  return {
    id: organization.id,
    name: organization.name,
    slug: organization.slug,
    description: organization.description,
    logoUrl: organization.logoUrl,
    isDeleted: organization.isDeleted,
    isPersonal: organization.isPersonal,
    maxMembers: organization.maxMembers,
    createdBy: organization.createdBy,
    createdAt: organization.createdAt,
    updatedAt: organization.updatedAt,
  };
};
