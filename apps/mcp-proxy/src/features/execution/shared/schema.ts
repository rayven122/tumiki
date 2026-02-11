/**
 * 実行系API（チャット・エージェント）共通スキーマ
 *
 * features/chat/schema.ts から移動
 */

import { z } from "zod";

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

/**
 * チャットPOSTリクエストボディのスキーマ
 */
export const postRequestBodySchema = z.object({
  /** チャットID */
  id: z.string().cuid(),
  /** 組織ID */
  organizationId: z.string(),
  // AI SDK 6: メッセージ形式
  message: z.object({
    id: z.string(),
    role: z.enum(["user"]),
    parts: z.array(messagePartSchema).min(1),
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
  /** Vercel AI Gateway 形式のモデルID */
  selectedChatModel: z.string(),
  /** チャットの可視性 */
  selectedVisibilityType: z.enum(["PRIVATE", "ORGANIZATION", "PUBLIC"]),
  /** 選択されたMCPサーバーIDの配列 */
  selectedMcpServerIds: z.array(z.string()).optional().default([]),
  /** Coharu が有効かどうか */
  isCoharuEnabled: z.boolean().optional().default(false),
});

export type PostRequestBody = z.infer<typeof postRequestBodySchema>;

/**
 * AI SDK 6 の UIMessage ツール状態
 */
export type ToolState =
  | "input-streaming"
  | "input-available"
  | "output-available"
  | "output-error";

/**
 * 古い形式のツール状態（後方互換性用）
 */
type LegacyToolState = "call" | "partial-call" | "result" | "error";

/**
 * DBに保存されているツールパーツの型
 */
export type DBToolPart = {
  type: string;
  toolCallId: string;
  state: ToolState | LegacyToolState;
  input?: unknown;
  output?: unknown;
};

/**
 * DBに保存されているツール状態を AI SDK 6 形式に変換
 */
export const convertToolState = (state: string): ToolState => {
  // 新しい形式の場合はそのまま返す
  if (
    state === "input-streaming" ||
    state === "input-available" ||
    state === "output-available" ||
    state === "output-error"
  ) {
    return state as ToolState;
  }

  // 古い形式からの変換（後方互換性）
  switch (state) {
    case "call":
      return "input-available";
    case "partial-call":
      return "input-streaming";
    case "result":
      return "output-available";
    case "error":
      return "output-error";
    default:
      return "input-available";
  }
};
