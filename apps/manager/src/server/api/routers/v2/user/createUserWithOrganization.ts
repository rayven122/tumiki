import { Role, type PrismaTransactionClient } from "@tumiki/db";
import { generateUniqueSlug } from "@tumiki/db/utils/slug";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { KeycloakOrganizationProvider } from "@tumiki/keycloak";

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
 * ユーザーと個人組織を同時に作成
 *
 * トランザクション内で以下を実行：
 * 1. ユーザーを作成
 * 2. Keycloakに個人組織グループを作成（slugをグループ名として使用）
 * 3. DBに個人組織と OrganizationMember を同時作成
 * 4. ユーザーのdefaultOrganizationSlugを個人組織に設定
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

  // 2. Keycloakに個人組織グループを作成
  // slugをKeycloakグループ名として使用
  const provider = KeycloakOrganizationProvider.fromEnv();
  const result = await provider.createOrganization({
    name: `${baseName}'s Workspace`,
    groupName: slug,
    ownerId: input.id, // User.id = Keycloak subを使用
  });

  if (!result.success) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `Keycloakグループの作成に失敗しました: ${result.error}`,
    });
  }

  // 3. DBに個人組織と OrganizationMember を同時作成
  await tx.organization.create({
    data: {
      id: result.externalId, // Keycloak Group IDを使用
      name: `${baseName}'s Workspace`,
      slug,
      description: "Personal workspace",
      isPersonal: true,
      maxMembers: 1,
      createdBy: input.id,
      members: {
        create: {
          userId: input.id,
        },
      },
    },
  });

  // 4. ユーザーのdefaultOrganizationSlugを個人組織に設定
  await tx.user.update({
    where: { id: input.id },
    data: { defaultOrganizationSlug: slug },
  });

  // データベースからのemailを検証
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
