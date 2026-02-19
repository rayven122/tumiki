// チャット機能ルーター（toolOutput は後方互換性のため root.ts にフラットで残す）

import { createTRPCRouter } from "@/server/api/trpc";
import { listPersonasProcedure } from "./listPersonas";

export const chatRouter = createTRPCRouter({
  listPersonas: listPersonasProcedure,
});
