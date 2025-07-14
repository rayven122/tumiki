import { TRPCError } from "@trpc/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import type { ProtectedContext } from "@/server/api/trpc";
import { OrganizationIdSchema } from "@/schema/ids";
import {
  OrganizationSchema,
  UserSchema,
  OrganizationMemberSchema,
  OrganizationInvitationSchema,
} from "@tumiki/db/zod";

export const getOrganizationByIdInputSchema = z.object({
  id: OrganizationIdSchema,
});

// 既存のZodスキーマを使用してOutputスキーマを定義
export const getOrganizationByIdOutputSchema = OrganizationSchema.pick({
  id: true,
  name: true,
  description: true,
  logoUrl: true,
  createdBy: true,
  createdAt: true,
  updatedAt: true,
  isDeleted: true,
}).extend({
  members: z.array(
    OrganizationMemberSchema.pick({
      userId: true,
      isAdmin: true,
    }).extend({
      user: UserSchema.pick({
        id: true,
        name: true,
        email: true,
        image: true,
      }),
    }),
  ),
  creator: UserSchema.pick({
    id: true,
    name: true,
    email: true,
  }),
  invitations: z.array(
    OrganizationInvitationSchema.pick({
      id: true,
      email: true,
      expires: true,
    }).extend({
      invitedByUser: UserSchema.pick({
        id: true,
        name: true,
      }),
    }),
  ),
  _count: z.object({
    groups: z.number(),
    roles: z.number(),
  }),
});

export type GetOrganizationByIdInput = z.infer<
  typeof getOrganizationByIdInputSchema
>;

export type GetOrganizationByIdOutput = z.infer<
  typeof getOrganizationByIdOutputSchema
>;

export const getOrganizationById = async ({
  input,
  ctx,
}: {
  input: GetOrganizationByIdInput;
  ctx: ProtectedContext;
}): Promise<GetOrganizationByIdOutput> => {
  const userId = ctx.session.user.id;

  // ユーザーが組織のメンバーであることを確認
  const membership = await ctx.db.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId: input.id,
        userId,
      },
    },
  });

  if (!membership) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "この組織へのアクセス権限がありません",
    });
  }

  try {
    // tRPCのoutputスキーマが不要なフィールドを自動で除去するため、includeで関連データを取得
    const organization = await ctx.db.organization.findUnique({
      where: {
        id: input.id,
        isDeleted: false,
      },
      include: {
        members: {
          include: {
            user: true,
          },
        },
        creator: true,
        invitations: {
          where: {
            expires: {
              gt: new Date(),
            },
          },
          include: {
            invitedByUser: true,
          },
        },
        _count: {
          select: {
            groups: true,
            roles: true,
          },
        },
      },
    });

    if (!organization) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "組織が見つかりません",
      });
    }

    return organization;
  } catch (error) {
    if (error instanceof TRPCError) {
      throw error;
    }

    console.error("Organization retrieval failed:", error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "データベースエラーが発生しました",
      });
    }

    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "組織の取得に失敗しました",
    });
  }
};
