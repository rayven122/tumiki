import { z } from "zod";
import { FeedbackIdSchema } from "@/schema/ids";

// 入力スキーマ（APIリクエスト用）
export const createFeedbackInputSchema = z.object({
  type: z.enum(["INQUIRY", "FEATURE_REQUEST"], {
    message: "有効なフィードバック種類を選択してください",
  }),
  subject: z
    .string()
    .min(1, "件名を入力してください")
    .max(200, "件名は200文字以内で入力してください"),
  content: z
    .string()
    .min(1, "内容を入力してください")
    .max(5000, "内容は5000文字以内で入力してください"),
  userAgent: z.string().optional(),
});

// データベース保存用の内部スキーマ（userId, organizationIdを含む）
export const createFeedbackDataSchema = createFeedbackInputSchema.extend({
  userId: z.string(),
  organizationId: z.string(),
});

// 出力スキーマ
export const createFeedbackOutputSchema = z.object({
  id: FeedbackIdSchema,
  success: z.boolean(),
  message: z.string(),
});

export type CreateFeedbackInput = z.infer<typeof createFeedbackInputSchema>;
export type CreateFeedbackData = z.infer<typeof createFeedbackDataSchema>;
export type CreateFeedbackOutput = z.infer<typeof createFeedbackOutputSchema>;
