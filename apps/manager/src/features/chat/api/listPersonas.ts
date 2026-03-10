// ペルソナ一覧取得（静的コンテンツのため publicProcedure を使用）

import { publicProcedure } from "@/server/api/trpc";
import { listPersonas } from "@tumiki/prompts";

export const listPersonasProcedure = publicProcedure.query(() =>
  listPersonas(),
);
