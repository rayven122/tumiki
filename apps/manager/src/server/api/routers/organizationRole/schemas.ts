import { z } from "zod";
import { PermissionAction, ResourceType } from "@tumiki/db";

// ロール作成用のスキーマ
export const CreateRoleInput = z.object({
  organizationId: z.string(),
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  isDefault: z.boolean().default(false),
  permissions: z.array(z.object({
    resourceType: z.nativeEnum(ResourceType),
    action: z.nativeEnum(PermissionAction),
  })).optional(),
});

// ロール更新用のスキーマ
export const UpdateRoleInput = z.object({
  id: z.string(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  isDefault: z.boolean().optional(),
});

// ロール削除用のスキーマ
export const DeleteRoleInput = z.object({
  id: z.string(),
});

// 組織のロール一覧取得用のスキーマ
export const GetRolesByOrganizationInput = z.object({
  organizationId: z.string(),
});

// 権限更新用のスキーマ
export const UpdatePermissionsInput = z.object({
  roleId: z.string(),
  permissions: z.array(z.object({
    resourceType: z.nativeEnum(ResourceType),
    action: z.nativeEnum(PermissionAction),
  })),
});

// デフォルトロール設定用のスキーマ
export const SetDefaultRoleInput = z.object({
  roleId: z.string(),
  organizationId: z.string(),
});