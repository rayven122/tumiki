import {
  getArtifactModel,
  sheetPrompt,
  updateDocumentPrompt,
} from "@/features/chat/services/ai";
import { createDocumentHandler } from "@/lib/artifacts/server";
import { type UIMessageStreamWriter, streamObject } from "ai";
import { z } from "zod";

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

export const sheetDocumentHandler = createDocumentHandler<"sheet">({
  kind: "sheet",
  onCreateDocument: async ({ title, writer }) => {
    let draftContent = "";

    const { fullStream } = streamObject({
      model: getArtifactModel(),
      system: sheetPrompt,
      prompt: title,
      schema: z.object({
        csv: z.string().describe("CSV data"),
      }),
    });

    for await (const delta of fullStream) {
      const { type } = delta;

      if (type === "object") {
        const { object } = delta;

        // Type guard for object with csv property
        if (object && typeof object === "object" && "csv" in object) {
          const { csv } = object as { csv: string };

          if (csv) {
            writeArtifactData(writer, "sheet-delta", csv);

            draftContent = csv;
          }
        }
      }
    }

    writeArtifactData(writer, "sheet-delta", draftContent);

    return draftContent;
  },
  onUpdateDocument: async ({ document, description, writer }) => {
    let draftContent = "";

    const { fullStream } = streamObject({
      model: getArtifactModel(),
      system: updateDocumentPrompt(document.content, "sheet"),
      prompt: description,
      schema: z.object({
        csv: z.string(),
      }),
    });

    for await (const delta of fullStream) {
      const { type } = delta;

      if (type === "object") {
        const { object } = delta;

        // Type guard for object with csv property
        if (object && typeof object === "object" && "csv" in object) {
          const { csv } = object as { csv: string };

          if (csv) {
            writeArtifactData(writer, "sheet-delta", csv);

            draftContent = csv;
          }
        }
      }
    }

    return draftContent;
  },
});
