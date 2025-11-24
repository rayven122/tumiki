import { z } from "zod";
import { nameValidationSchema } from "@/schema/validation";
import { McpServerIdSchema } from "@/schema/ids";

// APIキー生成用のスキーマ
export const CreateApiKeyInput = z.object({
  name: nameValidationSchema,
  mcpServerId: McpServerIdSchema,
  expiresInDays: z.number().optional(),
});

// APIキー一覧取得用のスキーマ
export const ListApiKeysInput = z.object({
  mcpServerId: McpServerIdSchema.optional(),
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
