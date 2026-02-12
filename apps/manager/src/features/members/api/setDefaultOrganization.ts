import { type ProtectedContext } from "@/server/api/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { OrganizationIdSchema } from "@/schema/ids";

export const setDefaultOrganizationInputSchema = z.object({
  organizationId: OrganizationIdSchema,
});

export const setDefaultOrganizationOutputSchema = z.object({
  success: z.boolean(),
  organizationId: OrganizationIdSchema,
  organizationSlug: z.string(),
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

  // 指定された組織のメンバーであることを確認
  const membership = await db.organizationMember.findFirst({
    where: {
      userId,
      organizationId,
      organization: {
        isDeleted: false,
      },
    },
    include: {
      organization: {
        select: { slug: true },
      },
    },
  });

  if (!membership) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "この組織のメンバーではありません",
    });
  }

  return {
    success: true,
    organizationId,
    organizationSlug: membership.organization.slug,
  };
};
