import type { PrismaTransactionClient } from "@tumiki/db";
import { z } from "zod";

/**
 * ユーザー取得の入力スキーマ
 */
export const getUserWithOrganizationInputSchema = z.object({
  userId: z.string(),
});

export type GetUserWithOrganizationInput = z.infer<
  typeof getUserWithOrganizationInputSchema
>;

/**
 * ユーザー取得の出力スキーマ
 */
export const getUserWithOrganizationOutputSchema = z.object({
  id: z.string(),
  email: z.string().nullable(),
  name: z.string().nullable(),
  image: z.string().nullable(),
  role: z.enum(["SYSTEM_ADMIN", "USER"]),
  organizationId: z.string().nullable(),
  organizationSlug: z.string().nullable(),
  // isOrganizationAdminは削除（ロールはJWTから取得）
});

export type GetUserWithOrganizationOutput = z.infer<
  typeof getUserWithOrganizationOutputSchema
>;

/**
 * ユーザーと最新所属組織情報を取得
 *
 * セッションコールバックで使用される情報を取得：
 * - ユーザーの基本情報
 * - システムロール
 * - 最新加入組織の情報（OrganizationMember.createdAt desc）
 */
export const getUserWithOrganization = async (
  tx: PrismaTransactionClient,
  input: GetUserWithOrganizationInput,
): Promise<GetUserWithOrganizationOutput> => {
  const dbUser = await tx.user.findUnique({
    where: { id: input.userId },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      role: true,
    },
  });

  if (!dbUser) {
    throw new Error(`User not found: ${input.userId}`);
  }

  // 最新加入組織を取得（セッション管理方式）
  const latestMembership = await tx.organizationMember.findFirst({
    where: {
      userId: input.userId,
      organization: {
        isDeleted: false,
      },
    },
    include: {
      organization: {
        select: { id: true, slug: true },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return {
    id: dbUser.id,
    email: dbUser.email,
    name: dbUser.name,
    image: dbUser.image,
    role: dbUser.role,
    organizationId: latestMembership?.organization.id ?? null,
    organizationSlug: latestMembership?.organization.slug ?? null,
  };
};
