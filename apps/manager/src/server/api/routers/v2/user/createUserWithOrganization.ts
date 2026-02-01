import { randomUUID } from "crypto";
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

/** 個人組織の最大メンバー数（自分のみ） */
const PERSONAL_ORG_MAX_MEMBERS = 1;

/**
 * ユーザーと個人組織を同時に作成
 *
 * 個人組織はKeycloakグループを作成しない（メンバーは自分のみのため不要）
 * 組織IDには独自のUUIDを生成（認証基盤から独立させるため）
 *
 * トランザクション内で以下を実行：
 * 1. ユーザーを作成
 * 2. DBに個人組織と OrganizationMember を同時作成（独自UUID）
 * 3. ユーザーのdefaultOrganizationSlugを個人組織に設定
 */
export const createUserWithOrganization = async (
  tx: PrismaTransactionClient,
  input: CreateUserWithOrganizationInput,
): Promise<CreateUserWithOrganizationOutput> => {
  // ユーザー名ベースの個人slugを生成（@プレフィックス付き）
  const baseName = input.name ?? input.email ?? "User";
  const slug = await generateUniqueSlug(tx, baseName, "personalOrg");

  // 1. ユーザーを作成（defaultOrganizationSlugは組織作成後に設定）
  const createdUser = await tx.user.create({
    data: {
      id: input.id,
      name: input.name,
      email: input.email,
      emailVerified: input.emailVerified ?? null,
      image: input.image ?? null,
    },
  });

  // 2. DBに個人組織と OrganizationMember を同時作成
  // 個人組織は独自UUIDを生成（認証基盤から独立）
  const personalOrgId = randomUUID();
  await tx.organization.create({
    data: {
      id: personalOrgId,
      name: `${baseName}'s Workspace`,
      slug,
      description: "Personal workspace",
      isPersonal: true,
      maxMembers: PERSONAL_ORG_MAX_MEMBERS,
      createdBy: input.id,
      members: {
        create: {
          userId: input.id,
        },
      },
    },
  });

  // 3. ユーザーのdefaultOrganizationSlugを個人組織に設定
  await tx.user.update({
    where: { id: input.id },
    data: { defaultOrganizationSlug: slug },
  });

  // データベースからのemailを検証
  if (!createdUser.email) {
    throw new Error(
      "ユーザーは作成されましたが、データベースのメールアドレスがnullです。これは発生してはいけません。",
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
