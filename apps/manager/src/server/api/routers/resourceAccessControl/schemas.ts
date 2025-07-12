import { z } from "zod";
import { PermissionAction, ResourceType } from "@tumiki/db";

// アクセス制御ルール作成用のスキーマ
export const CreateAccessRuleInput = z.object({
  organizationId: z.string(),
  resourceType: z.nativeEnum(ResourceType),
  resourceId: z.string(),
  memberId: z.string().optional(),
  groupId: z.string().optional(),
  allowedActions: z.array(z.nativeEnum(PermissionAction)),
  deniedActions: z.array(z.nativeEnum(PermissionAction)).optional(),
});

// アクセス制御ルール更新用のスキーマ
export const UpdateAccessRuleInput = z.object({
  id: z.string(),
  allowedActions: z.array(z.nativeEnum(PermissionAction)).optional(),
  deniedActions: z.array(z.nativeEnum(PermissionAction)).optional(),
});

// アクセス制御ルール削除用のスキーマ
export const DeleteAccessRuleInput = z.object({
  id: z.string(),
});

// リソース別アクセス制御一覧取得用のスキーマ
export const GetByResourceInput = z.object({
  organizationId: z.string(),
  resourceType: z.nativeEnum(ResourceType),
  resourceId: z.string(),
});

// 権限チェック用のスキーマ
export const CheckAccessInput = z.object({
  organizationId: z.string(),
  resourceType: z.nativeEnum(ResourceType),
  resourceId: z.string(),
  action: z.nativeEnum(PermissionAction),
  userId: z.string().optional(), // 指定がない場合は現在のユーザー
});

// 権限テスト用のスキーマ
export const TestPermissionInput = z.object({
  organizationId: z.string(),
  resourceType: z.nativeEnum(ResourceType),
  resourceId: z.string(),
  userId: z.string(),
  action: z.nativeEnum(PermissionAction),
});