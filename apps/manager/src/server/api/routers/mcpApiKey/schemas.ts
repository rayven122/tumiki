import { z } from "zod";

// APIキー生成用のスキーマ
export const CreateApiKeyInput = z.object({
  name: z.string().min(1).max(100),
  userMcpServerInstanceId: z.string(),
  expiresInDays: z.number().optional(),
});

// APIキー一覧取得用のスキーマ
export const ListApiKeysInput = z.object({
  userMcpServerInstanceId: z.string().optional(),
});

// APIキー更新用のスキーマ
export const UpdateApiKeyInput = z.object({
  id: z.string(),
  name: z.string().min(1).max(100).optional(),
  isActive: z.boolean().optional(),
});

// APIキー削除用のスキーマ
export const DeleteApiKeyInput = z.object({
  id: z.string(),
});
