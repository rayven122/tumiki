import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { KeycloakOrganizationProvider } from "@tumiki/keycloak";
import { validateOrganizationAccess } from "@/server/utils/organizationPermissions";
import type { ProtectedContext } from "@/server/api/trpc";

// 予約語スラッグ
const RESERVED_ROLE_SLUGS = ["owner", "admin", "member", "viewer", "guest"];

/**
 * ロール作成 Input スキーマ
 */
export const createRoleInputSchema = z
  .object({
    slug: z
      .string()
      .min(1, "ロール識別子は必須です")
      .max(50, "ロール識別子は50文字以内で入力してください")
      .regex(
        /^[a-z0-9-]+$/,
        "ロール識別子は小文字英数字とハイフンのみ使用できます",
      ),
    name: z
      .string()
      .min(1, "ロール名は必須です")
      .max(100, "ロール名は100文字以内で入力してください"),
    description: z.string().max(500).optional(),
    isDefault: z.boolean().default(false),
    permissions: z
      .array(
        z.object({
          resourceType: z.enum([
            "MCP_SERVER_CONFIG",
            "MCP_SERVER",
            "MCP_SERVER_TEMPLATE",
          ]),
          resourceId: z.string().default(""), // 空文字列 = 全リソース
          read: z.boolean().default(false),
          write: z.boolean().default(false),
          execute: z.boolean().default(false),
        }),
      )
      .default([]),
  })
  .refine((data) => !RESERVED_ROLE_SLUGS.includes(data.slug), {
    message:
      "このロール識別子は予約語のため使用できません（owner, admin, member, viewer, guest）",
    path: ["slug"],
  });

export type CreateRoleInput = z.infer<typeof createRoleInputSchema>;

/**
 * ロール作成 Output スキーマ
 */
export const createRoleOutputSchema = z.object({
  organizationId: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  isDefault: z.boolean(),
  keycloakRoleName: z.string(),
  permissions: z.array(
    z.object({
      id: z.string(),
      resourceType: z.enum([
        "MCP_SERVER_CONFIG",
        "MCP_SERVER",
        "MCP_SERVER_TEMPLATE",
      ]),
      resourceId: z.string(),
      read: z.boolean(),
      write: z.boolean(),
      execute: z.boolean(),
      createdAt: z.date(),
      updatedAt: z.date(),
    }),
  ),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type CreateRoleOutput = z.infer<typeof createRoleOutputSchema>;

/**
 * ロール作成実装
 *
 * Sagaパターン:
 * 1. Keycloakグループロール作成
 * 2. DB OrganizationRole + RolePermission作成
 * 3. エラー時: Keycloakロールバック（削除）
 */
export const createRole = async ({
  input,
  ctx,
}: {
  input: CreateRoleInput;
  ctx: ProtectedContext;
}): Promise<CreateRoleOutput> => {
  // 1. 権限チェック（role:manage権限、チーム必須）
  validateOrganizationAccess(ctx.currentOrg, {
    requirePermission: "role:manage",
    requireTeam: true,
  });

  const keycloakRoleName = `org:${ctx.currentOrg.slug}:role:${input.slug}`;
  let keycloakRoleCreated = false;

  try {
    // 2. Keycloakでグループロール作成
    const keycloak = KeycloakOrganizationProvider.fromEnv();
    const keycloakResult = await keycloak.createGroupRole(ctx.currentOrg.id, {
      name: keycloakRoleName,
      description: input.description,
    });

    if (!keycloakResult.success) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Keycloakロールの作成に失敗しました: ${keycloakResult.error}`,
      });
    }

    keycloakRoleCreated = true;

    // 3. DBトランザクション（OrganizationRole + RolePermission）
    const role = await ctx.db.$transaction(
      async (tx: Parameters<Parameters<typeof ctx.db.$transaction>[0]>[0]) => {
        // 既存ロールチェック
        const existing = await tx.organizationRole.findUnique({
          where: {
            organizationId_slug: {
              organizationId: ctx.currentOrg.id,
              slug: input.slug,
            },
          },
        });

        if (existing) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "このロール識別子は既に使用されています",
          });
        }

        // OrganizationRole作成
        const newRole = await tx.organizationRole.create({
          data: {
            organizationId: ctx.currentOrg.id,
            slug: input.slug,
            name: input.name,
            description: input.description ?? null,
            isDefault: input.isDefault,
          },
        });

        // 権限が指定されている場合は作成
        if (input.permissions.length > 0) {
          await tx.rolePermission.createMany({
            data: input.permissions.map((perm) => ({
              organizationId: ctx.currentOrg.id,
              roleSlug: input.slug,
              resourceType: perm.resourceType,
              resourceId: perm.resourceId,
              read: perm.read,
              write: perm.write,
              execute: perm.execute,
            })),
          });
        }

        return newRole;
      },
    );

    // 4. 権限情報を含む完全なレスポンスを取得
    const fullRole = await ctx.db.organizationRole.findUnique({
      where: {
        organizationId_slug: {
          organizationId: ctx.currentOrg.id,
          slug: input.slug,
        },
      },
      include: {
        permissions: true,
      },
    });

    if (!fullRole) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "ロールの作成後の取得に失敗しました",
      });
    }

    return {
      ...fullRole,
      keycloakRoleName,
    };
  } catch (error) {
    // Keycloakロールバック（ロール削除）
    if (keycloakRoleCreated) {
      try {
        const keycloak = KeycloakOrganizationProvider.fromEnv();
        await keycloak.deleteGroupRole(ctx.currentOrg.id, input.slug);
        console.error(`Keycloakロールバック実行: ${keycloakRoleName}`, error);
      } catch (rollbackError) {
        console.error(
          "Keycloakロールバック失敗（手動削除が必要）:",
          rollbackError,
        );
      }
    }

    if (error instanceof TRPCError) {
      throw error;
    }

    console.error("ロール作成エラー:", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "ロールの作成中にエラーが発生しました",
    });
  }
};
