"use server";

import { generateText, type UIMessage } from "ai";
import { cookies } from "next/headers";
import {
  deleteMessagesByChatIdAfterTimestamp,
  getMessageById,
  updateChatVisiblityById,
} from "@/lib/db/queries";
import type { VisibilityType } from "@/components/visibility-selector";
import { getTitleModel } from "@/lib/ai/providers";

export const saveChatModelAsCookie = async (model: string) => {
  const cookieStore = await cookies();
  cookieStore.set("chat-model", model);
};

export const saveMcpServerIdsAsCookie = async (mcpServerIds: string[]) => {
  const cookieStore = await cookies();
  cookieStore.set("chat-mcp-servers", JSON.stringify(mcpServerIds));
};

export const getMcpServerIdsFromCookie = async (): Promise<string[]> => {
  const cookieStore = await cookies();
  const mcpServersCookie = cookieStore.get("chat-mcp-servers");
  if (!mcpServersCookie?.value) {
    return [];
  }
  try {
    return JSON.parse(mcpServersCookie.value) as string[];
  } catch {
    return [];
  }
};

export const generateTitleFromUserMessage = async ({
  message,
}: {
  message: UIMessage;
}) => {
  const { text: title } = await generateText({
    model: getTitleModel(),
    system: `\n
    - you will generate a short title based on the first message a user begins a conversation with
    - ensure it is not more than 80 characters long
    - the title should be a summary of the user's message
    - do not use quotes or colons`,
    prompt: JSON.stringify(message),
  });

  return title;
};

export const deleteTrailingMessages = async ({ id }: { id: string }) => {
  const message = await getMessageById({ id });

  if (message) {
    await deleteMessagesByChatIdAfterTimestamp({
      chatId: message.chatId,
      timestamp: message.createdAt,
    });
  }
};

export const updateChatVisibility = async ({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: VisibilityType;
}) => {
  await updateChatVisiblityById({ chatId, visibility });
};
