import { z } from "zod";

// 招待作成用のスキーマ
export const CreateInvitationInput = z.object({
  organizationId: z.string(),
  email: z.string().email("有効なメールアドレスを入力してください"),
  isAdmin: z.boolean().default(false),
  roleIds: z.array(z.string()).default([]),
  groupIds: z.array(z.string()).default([]),
  expiresInDays: z.number().min(1).max(30).default(7),
});

// 招待一覧取得用のスキーマ
export const GetInvitationsByOrganizationInput = z.object({
  organizationId: z.string(),
});

// 招待キャンセル用のスキーマ
export const CancelInvitationInput = z.object({
  invitationId: z.string(),
});

// 招待受諾用のスキーマ
export const AcceptInvitationInput = z.object({
  token: z.string(),
});

// 招待トークン検証用のスキーマ
export const ValidateTokenInput = z.object({
  token: z.string(),
});

// 招待再送用のスキーマ
export const ResendInvitationInput = z.object({
  invitationId: z.string(),
});