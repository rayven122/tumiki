import { z } from "zod";
import type { ProtectedContext } from "@/server/api/trpc";
import {
  validateOrganizationAdminAccess,
  findTargetMemberAndValidatePermission,
} from "@/server/utils/organizationPermissions";
import { removeMemberInput } from "@/server/utils/organizationSchemas";

export const removeMemberInputSchema = removeMemberInput;

export const removeMemberOutputSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  userId: z.string(),
  isAdmin: z.boolean(),
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
  // 管理者権限を検証し、組織データを取得
  const { organization } = await validateOrganizationAdminAccess(
    ctx.db,
    input.organizationId,
    ctx.session.user.id,
  );

  // 削除対象メンバーを検索し、削除権限を検証
  await findTargetMemberAndValidatePermission(organization, input.memberId);

  return await ctx.db.organizationMember.delete({
    where: { id: input.memberId },
  });
};
