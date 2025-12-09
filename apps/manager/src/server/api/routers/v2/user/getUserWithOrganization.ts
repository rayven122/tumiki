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
  isOrganizationAdmin: z.boolean(),
});

export type GetUserWithOrganizationOutput = z.infer<
  typeof getUserWithOrganizationOutputSchema
>;

/**
 * ユーザーとデフォルト組織情報を取得
 *
 * セッションコールバックで使用される情報を取得：
 * - ユーザーの基本情報
 * - システムロール
 * - デフォルト組織の情報
 * - 組織内管理者権限
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
      defaultOrganization: {
        select: {
          id: true,
          slug: true,
          members: {
            where: { userId: input.userId },
            select: { isAdmin: true },
          },
        },
      },
    },
  });

  if (!dbUser) {
    throw new Error(`User not found: ${input.userId}`);
  }

  // デフォルト組織情報を取得
  const organizationId = dbUser.defaultOrganization?.id ?? null;
  const organizationSlug = dbUser.defaultOrganization?.slug ?? null;
  const isOrganizationAdmin =
    dbUser.defaultOrganization?.members[0]?.isAdmin ?? false;

  return {
    id: dbUser.id,
    email: dbUser.email,
    name: dbUser.name,
    image: dbUser.image,
    role: dbUser.role,
    organizationId,
    organizationSlug,
    isOrganizationAdmin,
  };
};
