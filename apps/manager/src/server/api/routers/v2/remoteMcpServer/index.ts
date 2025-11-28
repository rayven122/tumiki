import { z } from "zod";
import { nameValidationSchema } from "@/schema/validation";

// 型定義のみエクスポート（userMcpServerで使用）
export const CreateRemoteMcpServerInputV2 = z.object({
  // テンプレートIDまたはカスタムURL（いずれか必須）
  templateId: z.string().optional(),
  customUrl: z.string().url().optional(),

  // サーバー情報
  name: nameValidationSchema.optional(),
  description: z.string().optional(),
});

export const CreateRemoteMcpServerOutputV2 = z.object({
  id: z.string(),
  authorizationUrl: z.string(),
});
