"use client";

import { useChat } from "@ai-sdk/react";
import { useEffect, useRef } from "react";
import { artifactDefinitions, type ArtifactKind } from "./artifact";
import type { Suggestion } from "@tumiki/db/prisma";
import { initialArtifactData, useArtifact } from "@/hooks/use-artifact";
import type { ChatMessage, CustomUIDataTypes } from "@/lib/types";

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
 * AI SDK 6ではdataプロパティが削除され、カスタムデータは
 * メッセージのparts内のdata-*タイプとして送信されます。
 * このコンポーネントはmessagesからdata partsを抽出して処理します。
 */
export function DataStreamHandler({ id }: { id: string }) {
  const { messages } = useChat<ChatMessage>({ id });
  const { artifact, setArtifact, setMetadata } = useArtifact();
  const processedDataPartsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!messages?.length) return;

    // メッセージからdata partsを抽出して処理
    messages.forEach((message) => {
      message.parts?.forEach((part, partIndex) => {
        // data-* タイプのパーツを処理
        if (part.type.startsWith("data-")) {
          const partKey = `${message.id}-${partIndex}`;

          // 既に処理済みのパーツはスキップ
          if (processedDataPartsRef.current.has(partKey)) {
            return;
          }
          processedDataPartsRef.current.add(partKey);

          // data-* から実際のタイプ名を抽出
          const dataType = part.type.replace(
            "data-",
            "",
          ) as keyof CustomUIDataTypes;
          const dataPart = part as {
            type: `data-${string}`;
            id?: string;
            data: unknown;
          };

          // DataStreamDeltaに変換
          const delta: DataStreamDelta = {
            type: convertDataTypeToDeltaType(dataType),
            content: dataPart.data as string | Suggestion,
          };

          // artifactDefinitionのonStreamPartを呼び出し
          const artifactDefinition = artifactDefinitions.find(
            (def) => def.kind === artifact.kind,
          );

          if (artifactDefinition?.onStreamPart) {
            artifactDefinition.onStreamPart({
              streamPart: delta,
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
              case "id":
                return {
                  ...draftArtifact,
                  documentId: delta.content as string,
                  status: "streaming",
                };

              case "title":
                return {
                  ...draftArtifact,
                  title: delta.content as string,
                  status: "streaming",
                };

              case "kind":
                return {
                  ...draftArtifact,
                  kind: delta.content as ArtifactKind,
                  status: "streaming",
                };

              case "clear":
                return {
                  ...draftArtifact,
                  content: "",
                  status: "streaming",
                };

              case "finish":
                return {
                  ...draftArtifact,
                  status: "idle",
                };

              default:
                return draftArtifact;
            }
          });
        }
      });
    });
  }, [messages, setArtifact, setMetadata, artifact]);

  return null;
}

/**
 * CustomUIDataTypesのキーをDataStreamDelta.typeに変換
 */
const convertDataTypeToDeltaType = (
  dataType: keyof CustomUIDataTypes,
): DataStreamDelta["type"] => {
  const mapping: Record<keyof CustomUIDataTypes, DataStreamDelta["type"]> = {
    textDelta: "text-delta",
    imageDelta: "image-delta",
    sheetDelta: "sheet-delta",
    codeDelta: "code-delta",
    suggestion: "suggestion",
    appendMessage: "text-delta", // appendMessageはtext-deltaとして扱う
    id: "id",
    title: "title",
    kind: "kind",
    clear: "clear",
    finish: "finish",
    "chat-title": "title", // chat-titleはtitleとして扱う
  };
  return mapping[dataType] || "text-delta";
};
