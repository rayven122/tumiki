import "server-only";
import type { UIMessageStreamWriter } from "ai";
import type { SessionData } from "~/auth";
import type { ArtifactKind } from "@/lib/types";
import type { Document } from "@tumiki/db/prisma";

export const artifactKinds = ["text", "code", "image", "sheet"] as const;

type DocumentHandlerParams = {
  id: string;
  title: string;
  writer: UIMessageStreamWriter;
  session: SessionData;
};

type UpdateDocumentParams = {
  document: Document;
  description: string;
  writer: UIMessageStreamWriter;
  session: SessionData;
};

type DocumentHandler = {
  kind: ArtifactKind;
  onCreateDocument: (params: DocumentHandlerParams) => Promise<void>;
  onUpdateDocument: (params: UpdateDocumentParams) => Promise<void>;
};

/**
 * ドキュメントハンドラーのリスト（将来の拡張用）
 */
export const documentHandlersByArtifactKind: DocumentHandler[] = [];

/**
 * ドキュメントハンドラーを作成するファクトリ関数
 */
export const createDocumentHandler = <T extends ArtifactKind>(
  kind: T,
): DocumentHandler => ({
  kind,
  onCreateDocument: async () => {
    // 将来の実装用プレースホルダー
  },
  onUpdateDocument: async () => {
    // 将来の実装用プレースホルダー
  },
});
