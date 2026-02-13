import { generateCUID } from "@/lib/utils";
import { type UIMessageStreamWriter, tool } from "ai";
import { z } from "zod";
import {
  artifactKinds,
  documentHandlersByArtifactKind,
} from "@/lib/artifacts/server";
import type { SessionData } from "~/auth";

type CreateDocumentProps = {
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

const createDocumentInputSchema = z.object({
  title: z.string(),
  kind: z.enum(artifactKinds),
});

export const createDocument = ({ session, writer }: CreateDocumentProps) =>
  tool({
    description:
      "Create a document for a writing or content creation activities. This tool will call other functions that will generate the contents of the document based on the title and kind.",
    inputSchema: createDocumentInputSchema,
    execute: async ({ title, kind }) => {
      const id = generateCUID();

      writeArtifactData(writer, "kind", kind);
      writeArtifactData(writer, "id", id);
      writeArtifactData(writer, "title", title);
      writeArtifactData(writer, "clear", "");

      const documentHandler = documentHandlersByArtifactKind.find(
        (documentHandlerByArtifactKind) =>
          documentHandlerByArtifactKind.kind === kind,
      );

      if (!documentHandler) {
        throw new Error(`No document handler found for kind: ${kind}`);
      }

      await documentHandler.onCreateDocument({
        id,
        title,
        writer,
        session,
      });

      writeArtifactData(writer, "finish", "");

      return {
        id,
        title,
        kind,
        content: "A document was created and is now visible to the user.",
      };
    },
  });
