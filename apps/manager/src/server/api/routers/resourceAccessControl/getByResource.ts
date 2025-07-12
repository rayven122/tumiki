import { type ProtectedContext } from "@/server/api/trpc";
import { type z } from "zod";
import { TRPCError } from "@trpc/server";
import type { GetByResourceInput } from "./schemas";

type GetByResourceProps = {
  ctx: ProtectedContext;
  input: z.infer<typeof GetByResourceInput>;
};

export const getByResource = async ({ ctx, input }: GetByResourceProps) => {
  const { db, session } = ctx;
  const userId = session.user.id;

  // 組織のメンバーかチェック
  const organizationMember = await db.organizationMember.findFirst({
    where: {
      organizationId: input.organizationId,
      userId,
    },
  });

  if (!organizationMember) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "この組織のアクセス制御ルールを表示する権限がありません",
    });
  }

  // 指定されたリソースに対するアクセス制御ルールを取得
  const accessRules = await db.resourceAccessControl.findMany({
    where: {
      organizationId: input.organizationId,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
    },
    include: {
      member: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
      group: {
        select: {
          id: true,
          name: true,
          description: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return accessRules;
};