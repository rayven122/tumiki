import type { ModelMessage } from "ai";
import type {
  LanguageModelV3StreamPart,
  LanguageModelV3Usage,
} from "@ai-sdk/provider";
import { TEST_PROMPTS } from "./basic";

// v3用の使用量情報
const mockUsage: LanguageModelV3Usage = {
  inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: 20, text: 20, reasoning: 0 },
};

export function compareMessages(
  firstMessage: ModelMessage,
  secondMessage: ModelMessage,
): boolean {
  if (firstMessage.role !== secondMessage.role) return false;

  if (
    !Array.isArray(firstMessage.content) ||
    !Array.isArray(secondMessage.content)
  ) {
    return false;
  }

  if (firstMessage.content.length !== secondMessage.content.length) {
    return false;
  }

  for (let i = 0; i < firstMessage.content.length; i++) {
    const item1 = firstMessage.content[i]!;
    const item2 = secondMessage.content[i]!;

    if (item1.type !== item2.type) return false;

    if (item1.type === "file" && item2.type === "file") {
      // ファイル比較ロジック
    } else if (item1.type === "text" && item2.type === "text") {
      if (item1.text !== item2.text) return false;
    } else if (item1.type === "tool-result" && item2.type === "tool-result") {
      if (item1.toolCallId !== item2.toolCallId) return false;
    } else {
      return false;
    }
  }

  return true;
}

let textPartId = 0;
let reasoningPartId = 0;

// v3形式のテキストデルタを生成
const textToDeltas = (text: string): LanguageModelV3StreamPart[] => {
  const id = `text-${++textPartId}`;
  const deltas: LanguageModelV3StreamPart[] = [{ type: "text-start", id }];

  const words = text.split(" ");
  for (const word of words) {
    deltas.push({ type: "text-delta", id, delta: `${word} ` });
  }

  deltas.push({ type: "text-end", id });
  return deltas;
};

// v3形式の推論デルタを生成
const reasoningToDeltas = (text: string): LanguageModelV3StreamPart[] => {
  const id = `reasoning-${++reasoningPartId}`;
  const deltas: LanguageModelV3StreamPart[] = [{ type: "reasoning-start", id }];

  const words = text.split(" ");
  for (const word of words) {
    deltas.push({ type: "reasoning-delta", id, delta: `${word} ` });
  }

  deltas.push({ type: "reasoning-end", id });
  return deltas;
};

// v3形式のfinishパートを生成
const createFinishPart = (
  finishReason: "stop" | "tool-calls" = "stop",
): LanguageModelV3StreamPart => ({
  type: "finish",
  finishReason,
  usage: mockUsage,
});

export const getResponseChunksByPrompt = (
  prompt: ModelMessage[],
  isReasoningEnabled = false,
): Array<LanguageModelV3StreamPart> => {
  const recentMessage = prompt.at(-1);

  if (!recentMessage) {
    throw new Error("No recent message found!");
  }

  if (isReasoningEnabled) {
    if (compareMessages(recentMessage, TEST_PROMPTS.USER_SKY)) {
      return [
        ...reasoningToDeltas("The sky is blue because of rayleigh scattering!"),
        ...textToDeltas("It's just blue duh!"),
        createFinishPart(),
      ];
    } else if (compareMessages(recentMessage, TEST_PROMPTS.USER_GRASS)) {
      return [
        ...reasoningToDeltas(
          "Grass is green because of chlorophyll absorption!",
        ),
        ...textToDeltas("It's just green duh!"),
        createFinishPart(),
      ];
    }
  }

  if (compareMessages(recentMessage, TEST_PROMPTS.USER_THANKS)) {
    return [...textToDeltas("You're welcome!"), createFinishPart()];
  } else if (compareMessages(recentMessage, TEST_PROMPTS.USER_GRASS)) {
    return [...textToDeltas("It's just green duh!"), createFinishPart()];
  } else if (compareMessages(recentMessage, TEST_PROMPTS.USER_SKY)) {
    return [...textToDeltas("It's just blue duh!"), createFinishPart()];
  } else if (compareMessages(recentMessage, TEST_PROMPTS.USER_NEXTJS)) {
    return [
      ...textToDeltas("With Next.js, you can ship fast!"),
      createFinishPart(),
    ];
  } else if (
    compareMessages(recentMessage, TEST_PROMPTS.USER_IMAGE_ATTACHMENT)
  ) {
    return [...textToDeltas("This painting is by Monet!"), createFinishPart()];
  } else if (compareMessages(recentMessage, TEST_PROMPTS.USER_TEXT_ARTIFACT)) {
    const toolId = `tool-input-${Date.now()}`;
    return [
      { type: "tool-input-start", id: toolId, toolName: "createDocument" },
      {
        type: "tool-input-delta",
        id: toolId,
        delta: JSON.stringify({
          title: "Essay about Silicon Valley",
          kind: "text",
        }),
      },
      { type: "tool-input-end", id: toolId },
      {
        type: "tool-call",
        toolCallId: toolId,
        toolName: "createDocument",
        // AI SDK 6: input は JSON文字列形式
        input: JSON.stringify({
          title: "Essay about Silicon Valley",
          kind: "text",
        }),
      },
      createFinishPart("tool-calls"),
    ];
  } else if (
    compareMessages(recentMessage, TEST_PROMPTS.CREATE_DOCUMENT_TEXT_CALL)
  ) {
    return [
      ...textToDeltas(`\n
# Silicon Valley: The Epicenter of Innovation

## Origins and Evolution

Silicon Valley, nestled in the southern part of the San Francisco Bay Area, emerged as a global technology hub in the late 20th century. Its transformation began in the 1950s when Stanford University encouraged its graduates to start their own companies nearby, leading to the formation of pioneering semiconductor firms that gave the region its name.

## The Innovation Ecosystem

What makes Silicon Valley unique is its perfect storm of critical elements: prestigious universities like Stanford and Berkeley, abundant venture capital, a culture that celebrates risk-taking, and a dense network of talented individuals. This ecosystem has consistently nurtured groundbreaking technologies from personal computers to social media platforms to artificial intelligence.

## Challenges and Criticisms

Despite its remarkable success, Silicon Valley faces significant challenges including extreme income inequality, housing affordability crises, and questions about technology's impact on society. Critics argue the region has developed a monoculture that sometimes struggles with diversity and inclusion.

## Future Prospects

As we move forward, Silicon Valley continues to reinvent itself. While some predict its decline due to remote work trends and competition from other tech hubs, the region's adaptability and innovative spirit suggest it will remain influential in shaping our technological future for decades to come.
`),
      createFinishPart(),
    ];
  } else if (
    compareMessages(recentMessage, TEST_PROMPTS.CREATE_DOCUMENT_TEXT_RESULT)
  ) {
    return [
      ...textToDeltas("A document was created and is now visible to the user."),
      createFinishPart("tool-calls"),
    ];
  } else if (compareMessages(recentMessage, TEST_PROMPTS.GET_WEATHER_CALL)) {
    const toolId = `tool-input-${Date.now()}`;
    return [
      { type: "tool-input-start", id: toolId, toolName: "getWeather" },
      {
        type: "tool-input-delta",
        id: toolId,
        delta: JSON.stringify({ latitude: 37.7749, longitude: -122.4194 }),
      },
      { type: "tool-input-end", id: toolId },
      {
        type: "tool-call",
        toolCallId: toolId,
        toolName: "getWeather",
        // AI SDK 6: input は JSON文字列形式
        input: JSON.stringify({ latitude: 37.7749, longitude: -122.4194 }),
      },
      createFinishPart("tool-calls"),
    ];
  } else if (compareMessages(recentMessage, TEST_PROMPTS.GET_WEATHER_RESULT)) {
    return [
      ...textToDeltas("The current temperature in San Francisco is 17°C."),
      createFinishPart(),
    ];
  }

  return [
    { type: "text-start", id: "unknown-1" },
    { type: "text-delta", id: "unknown-1", delta: "Unknown test prompt!" },
    { type: "text-end", id: "unknown-1" },
    createFinishPart(),
  ];
};
