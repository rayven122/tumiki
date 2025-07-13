import { TRPCError } from "@trpc/server";
import { z } from "zod";
import type { ProtectedContext } from "@/server/api/trpc";

export const createOrganizationInputSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional().nullable(),
  logoUrl: z.string().url().optional().nullable(),
  isPersonal: z.boolean().default(false),
});

export type CreateOrganizationInput = z.infer<
  typeof createOrganizationInputSchema
>;

export const createOrganization = async ({
  input,
  ctx,
}: {
  input: CreateOrganizationInput;
  ctx: ProtectedContext;
}) => {
  const userId = ctx.session.user.id;

  try {
    // 組織を作成
    const organization = await ctx.db.organization.create({
      data: {
        name: input.name,
        description: input.description,
        logoUrl: input.logoUrl,
        createdBy: userId,
        members: {
          create: {
            userId,
            isAdmin: true,
          },
        },
      },
      include: {
        members: {
          include: {
            user: true,
          },
        },
        creator: true,
      },
    });

    return organization;
  } catch {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "組織の作成に失敗しました",
    });
  }
};
