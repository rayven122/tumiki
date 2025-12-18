import { z } from "zod";
import type { ProtectedContext } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { InvitationTokenSchema } from "@/schema/ids";
import { getOrganizationProvider } from "~/lib/organizationProvider";

// 入力スキーマ
export const acceptInvitationInputSchema = z.object({
  token: InvitationTokenSchema,
});

// 出力スキーマ
export const acceptInvitationOutputSchema = z.object({
  organizationSlug: z.string(),
  organizationName: z.string(),
});

export type AcceptInvitationInput = z.infer<typeof acceptInvitationInputSchema>;
export type AcceptInvitationOutput = z.infer<
  typeof acceptInvitationOutputSchema
>;

/**
 * 招待を受け入れて組織に参加する
 *
 * @param input - 招待トークン
 * @param ctx - 保護されたコンテキスト
 * @returns 組織情報（slug, name, isAdmin）
 *
 * @throws NOT_FOUND - トークンが存在しない
 * @throws BAD_REQUEST - 有効期限切れ
 * @throws FORBIDDEN - メールアドレス不一致
 * @throws CONFLICT - 既にメンバー
 */
export const acceptInvitation = async ({
  input,
  ctx,
}: {
  input: AcceptInvitationInput;
  ctx: ProtectedContext;
}): Promise<AcceptInvitationOutput> => {
  try {
    // 1. トークンでDB検索
    const invitation = await ctx.db.organizationInvitation.findUnique({
      where: { token: input.token },
      include: {
        organization: true,
        invitedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // 2. 存在チェック
    if (!invitation) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "招待が見つかりません。",
      });
    }

    // 3. 有効期限チェック
    if (new Date() > invitation.expires) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "招待の有効期限が切れています。",
      });
    }

    // 4. メールアドレス照合（厳密）
    if (ctx.session.user.email !== invitation.email) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "この招待はあなたのメールアドレス宛ではありません。",
      });
    }

    // 5. 既存メンバーチェック
    const existingMember = await ctx.db.organizationMember.findFirst({
      where: {
        organizationId: invitation.organizationId,
        userId: ctx.session.user.id,
      },
    });

    if (existingMember) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "既にこの組織のメンバーです。",
      });
    }

    // 6. トランザクション処理
    const result = await ctx.db.$transaction(async (tx) => {
      // 6-1. OrganizationMember作成
      await tx.organizationMember.create({
        data: {
          organizationId: invitation.organizationId,
          userId: ctx.session.user.id,
        },
      });

      // 6-2. Keycloak Group にメンバー追加（招待時に指定されたロール）
      // Note: Week 2でexternalProviderIdフィールド追加後に有効化
      // 現時点では、externalProviderIdが存在する組織のみKeycloak統合
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const _provider = getOrganizationProvider();

      try {
        // 組織の基本情報を取得（Week 2以降はexternalProviderIdも含める）
        const org = await tx.organization.findUnique({
          where: { id: invitation.organizationId },
          select: { id: true },
        });

        if (!org) {
          throw new Error("Organization not found");
        }

        // TODO: Week 2でexternalProviderIdフィールド追加後にコメント解除
        // const role = invitation.roles[0] ?? "Member";
        // const addMemberResult = await provider.addMember({
        //   externalId: org.externalProviderId,
        //   userId: ctx.session.user.id,
        //   role: role as "Owner" | "Admin" | "Member" | "Viewer",
        // });
        //
        // if (!addMemberResult.success) {
        //   throw new Error(
        //     addMemberResult.error ?? "Failed to add member to Keycloak Group",
        //   );
        // }
      } catch (error) {
        console.error(
          "[AcceptInvitation] Keycloak integration skipped:",
          error,
        );
        // Week 2でexternalProviderIdフィールド追加まで、エラーをログのみに留める
      }

      // 6-3. 招待レコード削除（一度のみ使用可能）
      await tx.organizationInvitation.delete({
        where: { id: invitation.id },
      });

      return {
        organizationSlug: invitation.organization.slug,
        organizationName: invitation.organization.name,
      };
    });

    return result;
  } catch (error) {
    // TRPCErrorはそのまま再スロー
    if (error instanceof TRPCError) {
      throw error;
    }

    // その他のエラーは内部サーバーエラーとして処理
    console.error("招待受け入れエラー:", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "招待の受け入れ中にエラーが発生しました。",
    });
  }
};
