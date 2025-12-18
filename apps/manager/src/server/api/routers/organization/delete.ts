import { z } from "zod";
import type { ProtectedContext } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { getOrganizationProvider } from "~/lib/organizationProvider";
import { OrganizationIdSchema } from "@/schema/ids";

/**
 * 組織削除入力スキーマ
 */
export const deleteOrganizationInputSchema = z.object({
  organizationId: OrganizationIdSchema,
});

/**
 * 組織削除出力スキーマ
 */
export const deleteOrganizationOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

export type DeleteOrganizationInput = z.infer<
  typeof deleteOrganizationInputSchema
>;
export type DeleteOrganizationOutput = z.infer<
  typeof deleteOrganizationOutputSchema
>;

/**
 * 組織を削除
 *
 * @param input - 削除する組織のID
 * @param ctx - 保護されたコンテキスト
 * @returns 削除結果
 *
 * @throws NOT_FOUND - 組織が存在しない
 * @throws FORBIDDEN - 管理者権限がない
 * @throws BAD_REQUEST - 個人組織は削除できない
 * @throws BAD_REQUEST - 組織の作成者のみが削除できる
 */
export const deleteOrganization = async ({
  input,
  ctx,
}: {
  input: DeleteOrganizationInput;
  ctx: ProtectedContext;
}): Promise<DeleteOrganizationOutput> => {
  try {
    // 組織情報を取得
    const organization = await ctx.db.organization.findUnique({
      where: {
        id: input.organizationId,
        isDeleted: false,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        isPersonal: true,
        createdBy: true,
      },
    });

    if (!organization) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "組織が見つかりません",
      });
    }

    // 個人組織は削除できない
    if (organization.isPersonal) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "個人組織は削除できません",
      });
    }

    // 組織の作成者のみが削除できる
    if (organization.createdBy !== ctx.session.user.id) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "組織の作成者のみが削除できます",
      });
    }

    // Keycloakから組織グループを削除
    const provider = getOrganizationProvider();
    const deleteResult = await provider.deleteOrganization({
      externalId: organization.id, // Organization.idがKeycloak Group ID
    });

    if (!deleteResult.success) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Keycloakからの組織削除に失敗しました: ${deleteResult.error}`,
      });
    }

    // DBから組織を削除（カスケード削除により関連データも削除される）
    await ctx.db.organization.delete({
      where: { id: input.organizationId },
    });

    return {
      success: true,
      message: "組織を削除しました",
    };
  } catch (error) {
    if (error instanceof TRPCError) {
      throw error;
    }
    console.error("組織削除エラー:", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "組織の削除中にエラーが発生しました。",
    });
  }
};
