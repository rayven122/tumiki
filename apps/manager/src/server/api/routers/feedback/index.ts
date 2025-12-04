import { createTRPCRouter } from "@/server/api/trpc";
import { create } from "./create";

// tRPCルーター定義
export const feedbackRouter = createTRPCRouter({
  create,
});

// スキーマの型をエクスポート
export type { CreateFeedbackInput, CreateFeedbackOutput } from "./schemas";
