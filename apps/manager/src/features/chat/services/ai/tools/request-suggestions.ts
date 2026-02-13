import { z } from "zod";
import { type UIMessageStreamWriter, streamObject, tool } from "ai";
import { getDocumentById, saveSuggestions } from "@/lib/db/queries";
import type { Suggestion } from "@tumiki/db/prisma";
import { generateCUID } from "@/lib/utils";
import { getArtifactModel } from "../providers";
import type { SessionData } from "~/auth";

type RequestSuggestionsProps = {
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

const requestSuggestionsInputSchema = z.object({
  documentId: z.string().describe("The ID of the document to request edits"),
});

export const requestSuggestions = ({
  session,
  writer,
}: RequestSuggestionsProps) =>
  tool({
    description: "Request suggestions for a document",
    inputSchema: requestSuggestionsInputSchema,
    execute: async ({ documentId }) => {
      const document = await getDocumentById({ id: documentId });

      if (!document?.content) {
        return {
          error: "Document not found",
        };
      }

      const suggestions: Array<
        Omit<Suggestion, "userId" | "createdAt" | "documentCreatedAt">
      > = [];

      const { elementStream } = streamObject({
        model: getArtifactModel(),
        system:
          "You are a help writing assistant. Given a piece of writing, please offer suggestions to improve the piece of writing and describe the change. It is very important for the edits to contain full sentences instead of just words. Max 5 suggestions.",
        prompt: document.content,
        output: "array",
        schema: z.object({
          originalSentence: z.string().describe("The original sentence"),
          suggestedSentence: z.string().describe("The suggested sentence"),
          description: z.string().describe("The description of the suggestion"),
        }),
      });

      for await (const element of elementStream) {
        // Type guard for element with expected properties
        if (
          element &&
          typeof element === "object" &&
          "originalSentence" in element &&
          "suggestedSentence" in element &&
          "description" in element
        ) {
          const typedElement = element as {
            originalSentence: string;
            suggestedSentence: string;
            description: string;
          };

          const suggestion = {
            originalText: typedElement.originalSentence,
            suggestedText: typedElement.suggestedSentence,
            description: typedElement.description,
            id: generateCUID(),
            documentId: documentId,
            isResolved: false,
          };

          writeArtifactData(writer, "suggestion", suggestion);

          suggestions.push(suggestion);
        }
      }

      if (session.user?.id) {
        const userId = session.user.id;

        await saveSuggestions({
          suggestions: suggestions.map((suggestion) => ({
            ...suggestion,
            userId,
            createdAt: new Date(),
            documentCreatedAt: document.createdAt,
          })),
        });
      }

      return {
        id: documentId,
        title: document.title,
        kind: document.kind,
        message: "Suggestions have been added to the document",
      };
    },
  });
