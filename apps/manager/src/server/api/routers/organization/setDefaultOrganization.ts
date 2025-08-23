import { type ProtectedContext } from "@/server/api/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { OrganizationIdSchema } from "@/schema/ids";

export const setDefaultOrganizationInputSchema = z.object({
  organizationId: OrganizationIdSchema.nullable(),
});

export const setDefaultOrganizationOutputSchema = z.object({
  success: z.boolean(),
  defaultOrganizationId: OrganizationIdSchema.nullable(),
});

type SetDefaultOrganizationProps = {
  ctx: ProtectedContext;
  input: z.infer<typeof setDefaultOrganizationInputSchema>;
};

export const setDefaultOrganization = async ({
  ctx,
  input,
}: SetDefaultOrganizationProps) => {
  const { db, session } = ctx;
  const userId = session.user.id;
  const { organizationId } = input;

  // organizationIdがnullの場合は、個人組織を設定
  if (organizationId === null) {
    // 個人組織を探す
    const personalOrg = await db.organizationMember.findFirst({
      where: {
        userId,
        organization: {
          isPersonal: true,
          isDeleted: false,
        },
      },
      select: {
        organizationId: true,
      },
    });

    if (!personalOrg) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "個人組織が見つかりません",
      });
    }

    // 個人組織をデフォルトに設定
    await db.user.update({
      where: { id: userId },
      data: { defaultOrganizationId: personalOrg.organizationId },
    });

    return {
      success: true,
      defaultOrganizationId: personalOrg.organizationId,
    };
  }

  // 指定された組織のメンバーであることを確認
  const membership = await db.organizationMember.findFirst({
    where: {
      userId,
      organizationId,
      organization: {
        isDeleted: false,
      },
    },
  });

  if (!membership) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "この組織のメンバーではありません",
    });
  }

  // デフォルト組織を更新
  await db.user.update({
    where: { id: userId },
    data: { defaultOrganizationId: organizationId },
  });

  return {
    success: true,
    defaultOrganizationId: organizationId,
  };
};
