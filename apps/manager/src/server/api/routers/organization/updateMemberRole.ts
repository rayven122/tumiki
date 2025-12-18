import { z } from "zod";
import type { ProtectedContext } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { validateOrganizationAccess } from "@/server/utils/organizationPermissions";
import { getOrganizationProvider } from "~/lib/organizationProvider";

/**
 * メンバーロール変更入力スキーマ
 */
export const updateMemberRoleInputSchema = z.object({
  memberId: z.string(),
  newRole: z.enum(["Owner", "Admin", "Member", "Viewer"]),
});

/**
 * メンバーロール変更出力スキーマ
 */
export const updateMemberRoleOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleInputSchema>;
export type UpdateMemberRoleOutput = z.infer<
  typeof updateMemberRoleOutputSchema
>;

/**
 * メンバーのロールを変更
 *
 * @param input - メンバーIDと新しいロール
 * @param ctx - 保護されたコンテキスト
 * @returns 変更結果
 *
 * @throws NOT_FOUND - メンバーが存在しない
 * @throws FORBIDDEN - 管理者権限がない、または組織のメンバーではない
 * @throws BAD_REQUEST - 組織の作成者のロールは変更できない
 */
export const updateMemberRole = async ({
  input,
  ctx,
}: {
  input: UpdateMemberRoleInput;
  ctx: ProtectedContext;
}): Promise<UpdateMemberRoleOutput> => {
  try {
    // チームの管理者権限を検証
    validateOrganizationAccess(ctx.currentOrg, {
      requireAdmin: true,
      requireTeam: true,
    });

    // 対象メンバーを取得
    const targetMember = await ctx.db.organizationMember.findUnique({
      where: {
        id: input.memberId,
      },
      select: {
        id: true,
        userId: true,
        organizationId: true,
      },
    });

    if (!targetMember) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "対象のメンバーが見つかりません",
      });
    }

    // 現在の組織のメンバーか確認
    if (targetMember.organizationId !== ctx.currentOrg.id) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "このチームのメンバーではありません",
      });
    }

    // 組織の作成者のロールは変更できない
    if (targetMember.userId === ctx.currentOrg.createdBy) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "組織の作成者のロールは変更できません",
      });
    }

    // Keycloakでロールを更新
    const provider = getOrganizationProvider();
    const updateResult = await provider.updateMemberRole({
      externalId: ctx.currentOrg.id, // Organization.idがKeycloak Group ID
      userId: targetMember.userId,
      newRole: input.newRole,
    });

    if (!updateResult.success) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Keycloakでのロール変更に失敗しました: ${updateResult.error}`,
      });
    }

    // セッション無効化により即時JWT更新
    const invalidateResult = await provider.invalidateUserSessions({
      userId: targetMember.userId,
    });

    if (!invalidateResult.success) {
      console.warn(`セッション無効化に失敗しました: ${invalidateResult.error}`);
      // セッション無効化の失敗は致命的ではないため、警告のみ
    }

    return {
      success: true,
      message: "メンバーのロールを変更しました",
    };
  } catch (error) {
    if (error instanceof TRPCError) {
      throw error;
    }
    console.error("ロール変更エラー:", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "ロールの変更中にエラーが発生しました。",
    });
  }
};
