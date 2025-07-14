import { TRPCError } from "@trpc/server";
import { Prisma } from "@prisma/client";
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
    // トランザクションで組織作成の競合状態を回避
    const organization = await ctx.db.$transaction(async (db) => {
      // 既存組織の重複チェック
      const existingOrg = await db.organization.findFirst({
        where: {
          name: input.name,
          createdBy: userId,
          isDeleted: false,
        },
      });

      if (existingOrg) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "同じ名前の組織が既に存在します",
        });
      }

      return await db.organization.create({
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
    });

    return organization;
  } catch (error) {
    console.error("Organization creation failed:", error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        throw new TRPCError({
          code: "CONFLICT",
          message: "同じ名前の組織が既に存在します",
        });
      }
    }

    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "組織の作成に失敗しました",
    });
  }
};
