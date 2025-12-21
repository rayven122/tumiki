import type { PrismaTransactionClient } from "@tumiki/db";
import { generateUniqueSlug } from "@tumiki/db/utils/slug";
import { z } from "zod";
import { getOrganizationProvider } from "~/lib/organizationProvider";

/**
 * 個人組織作成の入力スキーマ
 */
export const createPersonalOrganizationInputSchema = z.object({
  userId: z.string(),
  userName: z.string().nullable().optional(),
  userEmail: z.string().nullable().optional(),
});

export type CreatePersonalOrganizationInput = z.infer<
  typeof createPersonalOrganizationInputSchema
>;

/**
 * 個人組織作成の出力スキーマ
 */
export const createPersonalOrganizationOutputSchema = z.object({
  id: z.string(),
  slug: z.string(),
});

export type CreatePersonalOrganizationOutput = z.infer<
  typeof createPersonalOrganizationOutputSchema
>;

/**
 * ユーザーの個人組織を作成する
 *
 * 既に個人組織が存在する場合はスキップされる
 * Keycloakグループと連動して組織を作成し、DBに保存する
 *
 * @param tx Prismaトランザクションクライアント
 * @param input 作成データ
 * @returns 作成された個人組織情報（既に存在する場合は既存の情報）
 */
export const createPersonalOrganization = async (
  tx: PrismaTransactionClient,
  input: CreatePersonalOrganizationInput,
): Promise<CreatePersonalOrganizationOutput> => {
  const { userId, userName, userEmail } = input;

  // ユーザー情報を取得
  const user = await tx.user.findUnique({
    where: { id: userId },
    include: {
      members: {
        where: {
          organization: {
            isPersonal: true,
          },
        },
        include: {
          organization: true,
        },
      },
    },
  });

  if (!user) {
    throw new Error(`User not found: ${userId}`);
  }

  // 既に個人組織が存在する場合はスキップ
  if (user.members.length > 0 && user.members[0]?.organization) {
    return {
      id: user.members[0].organization.id,
      slug: user.members[0].organization.slug,
    };
  }

  // ベース名を決定
  const baseName = userName ?? userEmail ?? "User";

  // ユニークなslugを生成（Keycloakグループ名として使用）
  const slug = await generateUniqueSlug(tx, baseName, true);

  // Keycloakに個人組織グループを作成
  // User.id = Keycloak subなので、userIdを直接使用
  const provider = getOrganizationProvider();
  const groupName = slug; // slugをグループ名として使用

  const orgResult = await provider.createOrganization({
    name: `${baseName}'s Workspace`,
    groupName,
    ownerId: userId,
  });

  if (!orgResult.success) {
    throw new Error(`Keycloakグループの作成に失敗しました: ${orgResult.error}`);
  }

  // DBに個人組織と OrganizationMember を同時作成
  const organization = await tx.organization.create({
    data: {
      id: orgResult.externalId,
      name: `${baseName}'s Workspace`,
      slug,
      description: "Personal workspace",
      isPersonal: true,
      maxMembers: 1,
      createdBy: userId,
      members: {
        create: {
          userId,
        },
      },
    },
  });

  // Keycloakのカスタム属性にデフォルト組織を設定
  // User.id = Keycloak subなので、userIdを直接使用
  const setDefaultResult = await provider.setUserDefaultOrganization({
    userId,
    organizationId: orgResult.externalId,
  });

  if (!setDefaultResult.success) {
    console.warn(
      `[CreatePersonalOrganization] Keycloakのデフォルト組織設定に失敗: ${setDefaultResult.error}`,
    );
  }

  return {
    id: organization.id,
    slug: organization.slug,
  };
};
