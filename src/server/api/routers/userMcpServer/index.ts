import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { z } from "zod";
import { addUserMcpServer } from "./addUserMcpServer";

export const userMcpServerRouter = createTRPCRouter({
  add: protectedProcedure
    .input(
      z.object({
        mcpServerId: z.string(),
        envVars: z.record(z.string(), z.string()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await addUserMcpServer(
        ctx.db,
        ctx.session.user.id,
        input.mcpServerId,
        input.envVars,
      );
    }),
});
