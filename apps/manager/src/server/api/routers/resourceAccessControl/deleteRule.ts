import { type ProtectedContext } from "@/server/api/trpc";
import { type z } from "zod";
import { TRPCError } from "@trpc/server";
import type { DeleteAccessRuleInput } from "./schemas";

type DeleteRuleProps = {
  ctx: ProtectedContext;
  input: z.infer<typeof DeleteAccessRuleInput>;
};

export const deleteRule = async ({ ctx, input }: DeleteRuleProps) => {
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
      message: "このアクセス制御ルールを削除する権限がありません",
    });
  }

  // アクセス制御ルールを削除
  await db.resourceAccessControl.delete({
    where: { id: input.id },
  });

  return { success: true, message: "アクセス制御ルールを削除しました" };
};