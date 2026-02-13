import { type UIMessageStreamWriter, tool } from "ai";
import { z } from "zod";
import { getDocumentById } from "@/lib/db/queries";
import { documentHandlersByArtifactKind } from "@/lib/artifacts/server";
import type { SessionData } from "~/auth";

type UpdateDocumentProps = {
  session: SessionData;
  writer: UIMessageStreamWriter;
};

// UIMessageStreamWriterにデータを書き込むヘルパー関数
// AI SDK 6では `data-${string}` パターンを使用
// vercel/ai-chatbot に合わせて transient: true を追加
const writeArtifactData = (
  writer: UIMessageStreamWriter,
  dataType: string,
  content: unknown,
) => {
  writer.write({
    type: `data-${dataType}`,
    data: content,
    transient: true,
  });
};

const updateDocumentInputSchema = z.object({
  id: z.string().describe("The ID of the document to update"),
  description: z
    .string()
    .describe("The description of changes that need to be made"),
});

export const updateDocument = ({ session, writer }: UpdateDocumentProps) =>
  tool({
    description: "Update a document with the given description.",
    inputSchema: updateDocumentInputSchema,
    execute: async ({ id, description }) => {
      const document = await getDocumentById({ id });

      if (!document) {
        return {
          error: "Document not found",
        };
      }

      writeArtifactData(writer, "clear", document.title);

      const documentHandler = documentHandlersByArtifactKind.find(
        (documentHandlerByArtifactKind) =>
          documentHandlerByArtifactKind.kind === document.kind,
      );

      if (!documentHandler) {
        throw new Error(`No document handler found for kind: ${document.kind}`);
      }

      await documentHandler.onUpdateDocument({
        document,
        description,
        writer,
        session,
      });

      writeArtifactData(writer, "finish", "");

      return {
        id,
        title: document.title,
        kind: document.kind,
        content: "The document has been updated successfully.",
      };
    },
  });
