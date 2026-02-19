// チャット機能ルーター

import { createTRPCRouter } from "@/server/api/trpc";
import { listPersonasProcedure } from "./listPersonas";

export const chatRouter = createTRPCRouter({
  listPersonas: listPersonasProcedure,
});
