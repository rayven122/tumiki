import { z } from "zod";
import { chatModels } from "@/features/chat/services/ai";

// AI SDK 6: parts配列内のテキストパート
const textPartSchema = z.object({
  type: z.literal("text"),
  text: z.string().min(1).max(2000),
});

// AI SDK 6: parts配列内のファイルパート（画像添付用）
const filePartSchema = z.object({
  type: z.literal("file"),
  url: z.string().url(),
  mediaType: z.enum(["image/png", "image/jpg", "image/jpeg"]),
});

// AI SDK 6: partsはテキストまたはファイルの配列
const messagePartSchema = z.union([textPartSchema, filePartSchema]);

// chatModels からモデルIDを動的に取得
const chatModelIds = chatModels.map((model) => model.id) as [
  string,
  ...string[],
];

export const postRequestBodySchema = z.object({
  id: z.string().cuid(),
  /// 組織ID
  organizationId: z.string(),
  // AI SDK 6: メッセージ形式が変更（content → parts、experimental_attachments 廃止）
  message: z.object({
    id: z.string(),
    role: z.enum(["user"]),
    parts: z.array(messagePartSchema).min(1),
    // AI SDK 6: experimental_attachments は廃止され、parts内のfileタイプに移行
    // 後方互換性のためオプショナルで残す
    experimental_attachments: z
      .array(
        z.object({
          url: z.string().url(),
          name: z.string().min(1).max(2000),
          contentType: z.enum(["image/png", "image/jpg", "image/jpeg"]),
        }),
      )
      .optional(),
  }),
  // Vercel AI Gateway 形式のモデルID（provider/model-name）
  selectedChatModel: z.enum(chatModelIds),
  /// チャットの可視性（PRIVATE, ORGANIZATION, PUBLIC）
  selectedVisibilityType: z.enum(["PRIVATE", "ORGANIZATION", "PUBLIC"]),
  /// 選択されたMCPサーバーIDの配列
  selectedMcpServerIds: z.array(z.string()).optional().default([]),
  /// Coharu が有効かどうか
  isCoharuEnabled: z.boolean().optional().default(false),
});

export type PostRequestBody = z.infer<typeof postRequestBodySchema>;
