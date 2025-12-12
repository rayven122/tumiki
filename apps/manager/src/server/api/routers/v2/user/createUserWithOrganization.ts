import { Role, type PrismaTransactionClient } from "@tumiki/db";
import { generateUniqueSlug } from "@tumiki/db/utils/slug";
import { z } from "zod";

/**
 * ユーザー作成の入力スキーマ
 */
export const createUserWithOrganizationInputSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  email: z.string().email(),
  emailVerified: z.date().nullable().optional(),
  image: z.string().nullable().optional(),
});

export type CreateUserWithOrganizationInput = z.infer<
  typeof createUserWithOrganizationInputSchema
>;

/**
 * ユーザー作成の出力スキーマ
 */
export const createUserWithOrganizationOutputSchema = z.object({
  id: z.string(),
  email: z.string(),
  emailVerified: z.date().nullable(),
  role: z.nativeEnum(Role),
  name: z.string().nullable(),
  image: z.string().nullable(),
});

export type CreateUserWithOrganizationOutput = z.infer<
  typeof createUserWithOrganizationOutputSchema
>;

/**
 * ユーザーと個人を同時に作成
 *
 * トランザクション内で以下を実行（循環参照を回避するため段階的に作成）：
 * 1. ユーザーを defaultOrganizationSlug なしで作成
 * 2. 個人と OrganizationMember を同時作成
 * 3. ユーザーの defaultOrganizationSlug を更新
 */
export const createUserWithOrganization = async (
  tx: PrismaTransactionClient,
  input: CreateUserWithOrganizationInput,
): Promise<CreateUserWithOrganizationOutput> => {
  // ユーザー名ベースの個人slugを生成
  const baseName = input.name ?? input.email ?? "User";
  const slug = await generateUniqueSlug(tx, baseName, true);

  // 1. ユーザーを defaultOrganizationSlug なしで作成（循環参照を回避）
  const createdUser = await tx.user.create({
    data: {
      id: input.id,
      name: input.name,
      email: input.email,
      emailVerified: input.emailVerified ?? null,
      image: input.image ?? null,
      // defaultOrganizationSlug は後で設定
    },
  });

  // 2. 個人と OrganizationMember を同時作成（ユーザーが既に存在するため createdBy 制約を満たせる）
  await tx.organization.create({
    data: {
      name: `${input.name ?? input.email ?? "User"}'s Workspace`,
      slug,
      description: "Personal workspace",
      isPersonal: true,
      maxMembers: 1,
      createdBy: input.id,
      members: {
        create: {
          userId: input.id,
          isAdmin: true,
        },
      },
    },
  });

  // 3. ユーザーの defaultOrganizationSlug を更新
  await tx.user.update({
    where: { id: input.id },
    data: { defaultOrganizationSlug: slug },
  });

  // データベースからのemailも検証（念のため）
  if (!createdUser.email) {
    throw new Error(
      "User was created but email is null in database. This should not happen.",
    );
  }

  // 出力型に変換
  return {
    id: createdUser.id,
    email: createdUser.email,
    emailVerified: createdUser.emailVerified,
    role: createdUser.role,
    name: createdUser.name,
    image: createdUser.image,
  };
};
