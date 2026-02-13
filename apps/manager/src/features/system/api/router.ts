import { createTRPCRouter } from "@/server/api/trpc";
import { checkEEFeature } from "./checkEEFeature";

/**
 * システム関連のtRPCルーター
 *
 * EE機能チェックなど、システム全体の設定や状態を管理するエンドポイントを提供
 */
export const systemRouter = createTRPCRouter({
  checkEEFeature,
});
