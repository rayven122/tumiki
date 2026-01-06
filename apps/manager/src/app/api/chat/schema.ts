import { z } from "zod";

const textPartSchema = z.object({
  text: z.string().min(1).max(2000),
  type: z.enum(["text"]),
});

export const postRequestBodySchema = z.object({
  id: z.string().cuid(),
  message: z.object({
    id: z.string(),
    createdAt: z.coerce.date(),
    role: z.enum(["user"]),
    content: z.string().min(1).max(2000),
    parts: z.array(textPartSchema),
    experimental_attachments: z
      .array(
        z.object({
          url: z.string().url(),
          name: z.string().min(1).max(2000),
          contentType: z.enum(["image/png", "image/jpg", "image/jpeg"]),
        }),
      )
      .optional(),
  }),
  selectedChatModel: z.enum([
    // xAI (Grok)
    "grok-4-fast",
    "grok-4-reasoning",
    "grok-4-vision",
    "grok-3-mini",
    // Anthropic (Claude)
    "claude-sonnet-4",
    "claude-opus-4",
    "claude-haiku-3.5",
    // OpenAI
    "gpt-4o",
    "gpt-4o-mini",
    "o1",
    "o3-mini",
    // Google (Gemini)
    "gemini-2.0-flash",
    "gemini-2.5-pro",
    "gemini-2.5-flash",
  ]),
  selectedVisibilityType: z.enum(["public", "private"]),
});

export type PostRequestBody = z.infer<typeof postRequestBodySchema>;
