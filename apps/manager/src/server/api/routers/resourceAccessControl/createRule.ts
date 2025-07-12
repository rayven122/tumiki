import { type ProtectedContext } from "@/server/api/trpc";
import { type z } from "zod";
import { TRPCError } from "@trpc/server";
import type { CreateAccessRuleInput } from "./schemas";

type CreateRuleProps = {
  ctx: ProtectedContext;
  input: z.infer<typeof CreateAccessRuleInput>;
};

export const createRule = async ({ ctx, input }: CreateRuleProps) => {
  const { db, session } = ctx;
  const userId = session.user.id;

  // 組織のメンバーかつ管理者権限を持つかチェック
  const organizationMember = await db.organizationMember.findFirst({
    where: {
      organizationId: input.organizationId,
      userId,
      isAdmin: true,
    },
  });

  if (!organizationMember) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "この組織のアクセス制御ルールを作成する権限がありません",
    });
  }

  // メンバーIDとグループIDの両方が指定されている場合はエラー
  if (input.memberId && input.groupId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "メンバーIDとグループIDは同時に指定できません",
    });
  }

  // 指定されたメンバーまたはグループが存在し、組織に属しているかチェック
  if (input.memberId) {
    const member = await db.organizationMember.findFirst({
      where: {
        id: input.memberId,
        organizationId: input.organizationId,
      },
    });

    if (!member) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "指定されたメンバーが見つかりません",
      });
    }
  }

  if (input.groupId) {
    const group = await db.organizationGroup.findFirst({
      where: {
        id: input.groupId,
        organizationId: input.organizationId,
      },
    });

    if (!group) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "指定されたグループが見つかりません",
      });
    }
  }

  // 重複するアクセス制御ルールがないかチェック
  const existingRule = await db.resourceAccessControl.findFirst({
    where: {
      organizationId: input.organizationId,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      memberId: input.memberId,
      groupId: input.groupId,
    },
  });

  if (existingRule) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "同じリソースに対するアクセス制御ルールが既に存在します",
    });
  }

  // アクセス制御ルールを作成
  const accessRule = await db.resourceAccessControl.create({
    data: {
      organizationId: input.organizationId,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      memberId: input.memberId,
      groupId: input.groupId,
      allowedActions: input.allowedActions,
      deniedActions: input.deniedActions ?? [],
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
        },
      },
    },
  });

  return accessRule;
};