"use client";

import { useEffect } from "react";
import { artifactDefinitions, type ArtifactKind } from "./artifact";
import type { Suggestion } from "@tumiki/db/prisma";
import { initialArtifactData, useArtifact } from "@/hooks/use-artifact";
import { useDataStream } from "./data-stream-provider";

export type DataStreamDelta = {
  type:
    | "text-delta"
    | "code-delta"
    | "sheet-delta"
    | "image-delta"
    | "title"
    | "id"
    | "suggestion"
    | "clear"
    | "finish"
    | "kind";
  content: string | Suggestion;
};

/**
 * AI SDK 6ではuseChat の onData コールバックからデータを受信し、
 * DataStreamProvider経由でデータを処理します。
 */
export const DataStreamHandler = () => {
  const { dataStream, setDataStream } = useDataStream();
  const { artifact, setArtifact, setMetadata } = useArtifact();

  useEffect(() => {
    if (!dataStream?.length) {
      return;
    }

    // 新しいデルタを取り出してストリームをクリア
    const newDeltas = dataStream.slice();
    setDataStream([]);

    for (const delta of newDeltas) {
      // チャットタイトルの更新はchat.tsxのonFinishで処理されるためスキップ
      if (delta.type === "data-chat-title") {
        continue;
      }

      // kindが変更される場合は、新しいkindに基づいてartifactDefinitionを検索
      const currentKind =
        delta.type === "data-kind"
          ? (delta.data as ArtifactKind)
          : artifact.kind;

      // artifactDefinitionのonStreamPartを呼び出し
      const artifactDefinition = artifactDefinitions.find(
        (currentArtifactDefinition) =>
          currentArtifactDefinition.kind === currentKind,
      );

      // DataStreamDeltaに変換
      const streamPart: DataStreamDelta = {
        type: convertDeltaTypeToDeltaType(delta.type),
        content: delta.data as string | Suggestion,
      };

      if (artifactDefinition?.onStreamPart) {
        artifactDefinition.onStreamPart({
          streamPart,
          setArtifact,
          setMetadata,
        });
      }

      // artifactの状態を更新
      setArtifact((draftArtifact) => {
        if (!draftArtifact) {
          return { ...initialArtifactData, status: "streaming" };
        }

        switch (delta.type) {
          case "data-id":
            return {
              ...draftArtifact,
              documentId: delta.data as string,
              status: "streaming",
            };

          case "data-title":
            return {
              ...draftArtifact,
              title: delta.data as string,
              status: "streaming",
            };

          case "data-kind":
            return {
              ...draftArtifact,
              kind: delta.data as ArtifactKind,
              status: "streaming",
            };

          case "data-clear":
            return {
              ...draftArtifact,
              content: "",
              status: "streaming",
            };

          case "data-finish":
            return {
              ...draftArtifact,
              status: "idle",
            };

          default:
            return draftArtifact;
        }
      });
    }
  }, [dataStream, setArtifact, setMetadata, artifact, setDataStream]);

  return null;
};

/**
 * data-* 形式のタイプをDataStreamDelta.typeに変換
 * サーバー側のartifactハンドラーは `data-artifact-*-delta` 形式で送信
 */
const convertDeltaTypeToDeltaType = (
  deltaType: string,
): DataStreamDelta["type"] => {
  const mapping: Record<string, DataStreamDelta["type"]> = {
    // アーティファクトコンテンツのデルタ
    "data-artifact-text-delta": "text-delta",
    "data-artifact-image-delta": "image-delta",
    "data-artifact-sheet-delta": "sheet-delta",
    "data-artifact-code-delta": "code-delta",
    // メタデータイベント
    "data-suggestion": "suggestion",
    "data-id": "id",
    "data-title": "title",
    "data-kind": "kind",
    "data-clear": "clear",
    "data-finish": "finish",
  };
  return mapping[deltaType] || "text-delta";
};
