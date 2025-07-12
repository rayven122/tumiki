import { type ProtectedContext } from "@/server/api/trpc";
import { type z } from "zod";
import { TRPCError } from "@trpc/server";
import type { UpdateAccessRuleInput } from "./schemas";

type UpdateRuleProps = {
  ctx: ProtectedContext;
  input: z.infer<typeof UpdateAccessRuleInput>;
};

export const updateRule = async ({ ctx, input }: UpdateRuleProps) => {
  const { db, session } = ctx;
  const userId = session.user.id;

  // 既存のアクセス制御ルールを取得
  const existingRule = await db.resourceAccessControl.findUnique({
    where: { id: input.id },
    include: {
      organization: true,
    },
  });

  if (!existingRule) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "指定されたアクセス制御ルールが見つかりません",
    });
  }

  // 組織のメンバーかつ管理者権限を持つかチェック
  const organizationMember = await db.organizationMember.findFirst({
    where: {
      organizationId: existingRule.organizationId,
      userId,
      isAdmin: true,
    },
  });

  if (!organizationMember) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "このアクセス制御ルールを更新する権限がありません",
    });
  }

  // 更新データを準備
  const updateData: any = {};
  if (input.allowedActions !== undefined) {
    updateData.allowedActions = input.allowedActions;
  }
  if (input.deniedActions !== undefined) {
    updateData.deniedActions = input.deniedActions;
  }

  // アクセス制御ルールを更新
  const updatedRule = await db.resourceAccessControl.update({
    where: { id: input.id },
    data: updateData,
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
        },
      },
    },
  });

  return updatedRule;
};