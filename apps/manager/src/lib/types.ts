import type { InferUITool, UIMessage } from "ai";
import { z } from "zod";
import type { ArtifactKind } from "@/components/artifact";
import type { createDocument } from "./ai/tools/create-document";
import type { getWeather } from "./ai/tools/get-weather";
import type { requestSuggestions } from "./ai/tools/request-suggestions";
import type { updateDocument } from "./ai/tools/update-document";
import type { Suggestion } from "@tumiki/db/prisma";

export type DataPart = { type: "append-message"; message: string };

/**
 * メッセージメタデータのスキーマ
 */
export const messageMetadataSchema = z.object({
  createdAt: z.string(),
});

export type MessageMetadata = z.infer<typeof messageMetadataSchema>;

/**
 * AIツールの型定義
 */
type WeatherTool = InferUITool<typeof getWeather>;
type CreateDocumentTool = InferUITool<ReturnType<typeof createDocument>>;
type UpdateDocumentTool = InferUITool<ReturnType<typeof updateDocument>>;
type RequestSuggestionsTool = InferUITool<
  ReturnType<typeof requestSuggestions>
>;

export type ChatTools = {
  getWeather: WeatherTool;
  createDocument: CreateDocumentTool;
  updateDocument: UpdateDocumentTool;
  requestSuggestions: RequestSuggestionsTool;
};

/**
 * カスタムUIデータタイプ
 * artifactストリーミングで使用されるデータパーツの型定義
 */
export type CustomUIDataTypes = {
  textDelta: string;
  imageDelta: string;
  sheetDelta: string;
  codeDelta: string;
  suggestion: Suggestion;
  appendMessage: string;
  id: string;
  title: string;
  kind: ArtifactKind;
  clear: null;
  finish: null;
  "chat-title": string;
};

/**
 * チャットメッセージ型（AI SDK 6のUIMessage拡張）
 */
export type ChatMessage = UIMessage<
  MessageMetadata,
  CustomUIDataTypes,
  ChatTools
>;

/**
 * Attachment型（AI SDK 6で削除されたため独自定義）
 */
export type Attachment = {
  name: string;
  url: string;
  contentType: string;
};

/**
 * エージェント情報（エージェントチャットの場合のみ）
 */
export type AgentInfo = {
  name: string;
  iconPath: string | null;
} | null;
