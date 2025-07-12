import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { PermissionAction, ResourceType } from "@tumiki/db";

// ロール作成用のスキーマ
export const CreateRoleInput = z.object({
  organizationId: z.string().cuid(),
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  permissions: z.array(
    z.object({
      resourceType: z.nativeEnum(ResourceType),
      action: z.nativeEnum(PermissionAction),
    })
  ).optional(),
});

// ロール更新用のスキーマ
export const UpdateRoleInput = z.object({
  id: z.string().cuid(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
});

// ロール削除用のスキーマ
export const DeleteRoleInput = z.object({
  id: z.string().cuid(),
});

// 組織別ロール取得用のスキーマ
export const GetByOrganizationInput = z.object({
  organizationId: z.string().cuid(),
});

// 権限更新用のスキーマ
export const UpdatePermissionsInput = z.object({
  roleId: z.string().cuid(),
  permissions: z.array(
    z.object({
      resourceType: z.nativeEnum(ResourceType),
      action: z.nativeEnum(PermissionAction),
    })
  ),
});

// デフォルトロール設定用のスキーマ
export const SetDefaultInput = z.object({
  roleId: z.string().cuid(),
  organizationId: z.string().cuid(),
});

export const organizationRoleRouter = createTRPCRouter({
  // ロール作成
  create: protectedProcedure
    .input(CreateRoleInput)
    .mutation(async ({ ctx, input }) => {
      const { organizationId, name, description, permissions } = input;
      const userId = ctx.session.user.id;

      // 組織メンバーシップの確認
      const membership = await ctx.db.organizationMember.findFirst({
        where: {
          organizationId,
          userId,
        },
      });

      if (!membership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "組織のメンバーではありません",
        });
      }

      // 同名のロールが存在しないかチェック
      const existingRole = await ctx.db.organizationRole.findFirst({
        where: {
          organizationId,
          name,
        },
      });

      if (existingRole) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "同じ名前のロールが既に存在します",
        });
      }

      // ロールを作成
      const role = await ctx.db.organizationRole.create({
        data: {
          organizationId,
          name,
          description,
          permissions: permissions
            ? {
                create: permissions.map((perm) => ({
                  resourceType: perm.resourceType,
                  action: perm.action,
                })),
              }
            : undefined,
        },
        include: {
          permissions: true,
        },
      });

      return role;
    }),

  // ロール更新
  update: protectedProcedure
    .input(UpdateRoleInput)
    .mutation(async ({ ctx, input }) => {
      const { id, name, description } = input;
      const userId = ctx.session.user.id;

      // ロールの存在確認と組織メンバーシップの確認
      const role = await ctx.db.organizationRole.findUnique({
        where: { id },
        include: {
          organization: {
            include: {
              members: {
                where: { userId },
              },
            },
          },
        },
      });

      if (!role) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "ロールが見つかりません",
        });
      }

      if (role.organization.members.length === 0) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "組織のメンバーではありません",
        });
      }

      // 同名のロールが存在しないかチェック（自分以外）
      if (name) {
        const existingRole = await ctx.db.organizationRole.findFirst({
          where: {
            organizationId: role.organizationId,
            name,
            id: { not: id },
          },
        });

        if (existingRole) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "同じ名前のロールが既に存在します",
          });
        }
      }

      // ロールを更新
      const updatedRole = await ctx.db.organizationRole.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(description !== undefined && { description }),
        },
        include: {
          permissions: true,
        },
      });

      return updatedRole;
    }),

  // ロール削除
  delete: protectedProcedure
    .input(DeleteRoleInput)
    .mutation(async ({ ctx, input }) => {
      const { id } = input;
      const userId = ctx.session.user.id;

      // ロールの存在確認と組織メンバーシップの確認
      const role = await ctx.db.organizationRole.findUnique({
        where: { id },
        include: {
          organization: {
            include: {
              members: {
                where: { userId },
              },
            },
          },
          members: true,
          groups: true,
        },
      });

      if (!role) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "ロールが見つかりません",
        });
      }

      if (role.organization.members.length === 0) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "組織のメンバーではありません",
        });
      }

      // デフォルトロールは削除不可
      if (role.isDefault) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "デフォルトロールは削除できません",
        });
      }

      // 使用中のロールは削除不可
      if (role.members.length > 0 || role.groups.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "使用中のロールは削除できません",
        });
      }

      // ロールを削除
      await ctx.db.organizationRole.delete({
        where: { id },
      });

      return { success: true };
    }),

  // 組織のロール一覧取得
  getByOrganization: protectedProcedure
    .input(GetByOrganizationInput)
    .query(async ({ ctx, input }) => {
      const { organizationId } = input;
      const userId = ctx.session.user.id;

      // 組織メンバーシップの確認
      const membership = await ctx.db.organizationMember.findFirst({
        where: {
          organizationId,
          userId,
        },
      });

      if (!membership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "組織のメンバーではありません",
        });
      }

      // ロール一覧を取得
      const roles = await ctx.db.organizationRole.findMany({
        where: { organizationId },
        include: {
          permissions: true,
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  image: true,
                },
              },
            },
          },
          groups: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: {
              members: true,
              groups: true,
            },
          },
        },
        orderBy: [
          { isDefault: "desc" },
          { createdAt: "asc" },
        ],
      });

      return roles;
    }),

  // 権限設定更新
  updatePermissions: protectedProcedure
    .input(UpdatePermissionsInput)
    .mutation(async ({ ctx, input }) => {
      const { roleId, permissions } = input;
      const userId = ctx.session.user.id;

      // ロールの存在確認と組織メンバーシップの確認
      const role = await ctx.db.organizationRole.findUnique({
        where: { id: roleId },
        include: {
          organization: {
            include: {
              members: {
                where: { userId },
              },
            },
          },
        },
      });

      if (!role) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "ロールが見つかりません",
        });
      }

      if (role.organization.members.length === 0) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "組織のメンバーではありません",
        });
      }

      // 既存の権限を削除し、新しい権限を設定
      await ctx.db.$transaction(async (tx) => {
        // 既存の権限を削除
        await tx.rolePermission.deleteMany({
          where: { roleId },
        });

        // 新しい権限を追加
        if (permissions.length > 0) {
          await tx.rolePermission.createMany({
            data: permissions.map((perm) => ({
              roleId,
              resourceType: perm.resourceType,
              action: perm.action,
            })),
          });
        }
      });

      // 更新されたロールを返す
      const updatedRole = await ctx.db.organizationRole.findUnique({
        where: { id: roleId },
        include: {
          permissions: true,
        },
      });

      return updatedRole;
    }),

  // デフォルトロール設定
  setDefault: protectedProcedure
    .input(SetDefaultInput)
    .mutation(async ({ ctx, input }) => {
      const { roleId, organizationId } = input;
      const userId = ctx.session.user.id;

      // 組織メンバーシップの確認
      const membership = await ctx.db.organizationMember.findFirst({
        where: {
          organizationId,
          userId,
        },
      });

      if (!membership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "組織のメンバーではありません",
        });
      }

      // ロールの存在確認
      const role = await ctx.db.organizationRole.findUnique({
        where: { id: roleId },
      });

      if (!role || role.organizationId !== organizationId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "ロールが見つかりません",
        });
      }

      // デフォルトロールを更新
      await ctx.db.$transaction(async (tx) => {
        // 既存のデフォルトロールをリセット
        await tx.organizationRole.updateMany({
          where: {
            organizationId,
            isDefault: true,
          },
          data: {
            isDefault: false,
          },
        });

        // 新しいデフォルトロールを設定
        await tx.organizationRole.update({
          where: { id: roleId },
          data: {
            isDefault: true,
          },
        });
      });

      return { success: true };
    }),
});