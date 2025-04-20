import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { z } from "zod";
import { addUserMcpServer } from "./addUserMcpServer";

export const AddUserMcpServerInput = z.object({
  mcpServerId: z.string(),
  envVars: z.record(z.string(), z.string()),
});

export const userMcpServerRouter = createTRPCRouter({
  add: protectedProcedure
    .input(AddUserMcpServerInput)
    .mutation(addUserMcpServer),
});
