import type { UIMessage } from "ai";
import { z } from "zod";
import type { ArtifactKind } from "@/components/artifact";
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
 * 注意: サーバー専用モジュールへの依存を避けるため、手動で型を定義
 * ツールの実装から InferUITool で推論する代わりに、入出力型を直接定義
 */
type WeatherTool = {
  input: { latitude: number; longitude: number };
  output: { weather: string; temperature: number };
};

type CreateDocumentTool = {
  input: { title: string; kind: ArtifactKind };
  output: { id: string; title: string; kind: string; content: string };
};

type UpdateDocumentTool = {
  input: { id: string; description: string };
  output:
    | { id: string; title: string; kind: string; content: string }
    | { error: string };
};

type RequestSuggestionsTool = {
  input: { documentId: string };
  output: { suggestions: Suggestion[] };
};

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
