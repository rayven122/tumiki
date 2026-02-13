import { type UIMessageStreamWriter, smoothStream, streamText } from "ai";
import {
  getArtifactModel,
  updateDocumentPrompt,
} from "@/features/chat/services/ai";
import { createDocumentHandler } from "@/lib/artifacts/server";

// UIMessageStreamWriterにデータを書き込むヘルパー関数
// AI SDK 6では `data-${string}` パターンを使用
const writeArtifactData = (
  writer: UIMessageStreamWriter,
  dataType: string,
  content: unknown,
) => {
  writer.write({
    type: `data-artifact-${dataType}` as `data-${string}`,
    data: content,
  });
};

export const textDocumentHandler = createDocumentHandler<"text">({
  kind: "text",
  onCreateDocument: async ({ title, writer }) => {
    let draftContent = "";

    const { fullStream } = streamText({
      model: getArtifactModel(),
      system:
        "Write about the given topic. Markdown is supported. Use headings wherever appropriate.",
      experimental_transform: smoothStream({ chunking: "word" }),
      prompt: title,
    });

    for await (const delta of fullStream) {
      const { type } = delta;

      if (type === "text-delta") {
        const { text: textDelta } = delta;

        draftContent += textDelta;

        writeArtifactData(writer, "text-delta", textDelta);
      }
    }

    return draftContent;
  },
  onUpdateDocument: async ({ document, description, writer }) => {
    let draftContent = "";

    const { fullStream } = streamText({
      model: getArtifactModel(),
      system: updateDocumentPrompt(document.content, "text"),
      experimental_transform: smoothStream({ chunking: "word" }),
      prompt: description,
    });

    for await (const delta of fullStream) {
      const { type } = delta;

      if (type === "text-delta") {
        const { text: textDelta } = delta;

        draftContent += textDelta;
        writeArtifactData(writer, "text-delta", textDelta);
      }
    }

    return draftContent;
  },
});
