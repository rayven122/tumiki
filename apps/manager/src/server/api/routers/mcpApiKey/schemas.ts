import { z } from "zod";
import { nameValidationSchema } from "@/schema/validation";

// APIキー生成用のスキーマ
export const CreateApiKeyInput = z.object({
  name: nameValidationSchema,
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
  name: nameValidationSchema.optional(),
  isActive: z.boolean().optional(),
});

// APIキー削除用のスキーマ
export const DeleteApiKeyInput = z.object({
  id: z.string(),
});
