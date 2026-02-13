import { z } from "zod";
import { type UIMessageStreamWriter, streamObject } from "ai";
import {
  getArtifactModel,
  codePrompt,
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

export const codeDocumentHandler = createDocumentHandler<"code">({
  kind: "code",
  onCreateDocument: async ({ title, writer }) => {
    let draftContent = "";

    const { fullStream } = streamObject({
      model: getArtifactModel(),
      system: codePrompt,
      prompt: title,
      schema: z.object({
        code: z.string(),
      }),
    });

    for await (const delta of fullStream) {
      const { type } = delta;

      if (type === "object") {
        const { object } = delta;

        // Type guard for object with code property
        if (object && typeof object === "object" && "code" in object) {
          const { code } = object as { code: string };

          if (code) {
            writeArtifactData(writer, "code-delta", code ?? "");

            draftContent = code;
          }
        }
      }
    }

    return draftContent;
  },
  onUpdateDocument: async ({ document, description, writer }) => {
    let draftContent = "";

    const { fullStream } = streamObject({
      model: getArtifactModel(),
      system: updateDocumentPrompt(document.content, "code"),
      prompt: description,
      schema: z.object({
        code: z.string(),
      }),
    });

    for await (const delta of fullStream) {
      const { type } = delta;

      if (type === "object") {
        const { object } = delta;

        // Type guard for object with code property
        if (object && typeof object === "object" && "code" in object) {
          const { code } = object as { code: string };

          if (code) {
            writeArtifactData(writer, "code-delta", code ?? "");

            draftContent = code;
          }
        }
      }
    }

    return draftContent;
  },
});
