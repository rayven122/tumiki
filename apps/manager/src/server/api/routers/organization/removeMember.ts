import { z } from "zod";
import type { ProtectedContext } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { validateOrganizationAccess } from "@/server/utils/organizationPermissions";
import { removeMemberInput } from "@/server/utils/organizationSchemas";

export const removeMemberInputSchema = removeMemberInput;

export const removeMemberOutputSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  userId: z.string(),
  // isAdmin削除: JWTのrolesで判定
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type RemoveMemberInput = z.infer<typeof removeMemberInput>;
export type RemoveMemberOutput = z.infer<typeof removeMemberOutputSchema>;

export const removeMember = async ({
  input,
  ctx,
}: {
  input: RemoveMemberInput;
  ctx: ProtectedContext;
}): Promise<RemoveMemberOutput> => {
  // チームの管理者権限を検証
  validateOrganizationAccess(ctx.currentOrg, {
    requireAdmin: true,
    requireTeam: true,
  });

  // 削除対象メンバーを取得
  const targetMember = await ctx.db.organizationMember.findUnique({
    where: {
      id: input.memberId,
    },
    select: {
      id: true,
      userId: true,
      organizationId: true,
      createdAt: true,
      updatedAt: true,
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

  // 組織の作成者は削除できない
  if (targetMember.userId === ctx.currentOrg.createdBy) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "組織の作成者は削除できません",
    });
  }

  return await ctx.db.organizationMember.delete({
    where: { id: input.memberId },
  });
};
