import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { z } from "zod";
import { addUserMcpServer } from "./addUserMcpServer";
import { findAllWithMcpServerTools } from "./findAllWithTools";
import { updateUserMcpServer } from "./updateUserMcpServer";
import { deleteUserMcpServer } from "./deleteUserMcpServer";

export const AddUserMcpServerInput = z.object({
  mcpServerId: z.string(),
  envVars: z.record(z.string(), z.string()),
});

export const UpdateUserMcpServerInput = z.object({
  id: z.string(),
  envVars: z.record(z.string(), z.string()).optional(),
  name: z.string().optional(),
  // imageUrl: z.string().optional(),
});

export const DeleteUserMcpServerInput = z.object({
  id: z.string(),
});

export const userMcpServerRouter = createTRPCRouter({
  add: protectedProcedure
    .input(AddUserMcpServerInput)
    .mutation(addUserMcpServer),
  update: protectedProcedure
    .input(UpdateUserMcpServerInput)
    .mutation(updateUserMcpServer),
  delete: protectedProcedure
    .input(DeleteUserMcpServerInput)
    .mutation(deleteUserMcpServer),
  findAllWithMcpServerTools: protectedProcedure.query(
    findAllWithMcpServerTools,
  ),
});
