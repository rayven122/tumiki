import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { z } from "zod";
import { addUserMcpServer } from "./addUserMcpServer";
import { findAllWithMcpServerTools } from "./findAllWithTools";
import { updateUserMcpServer } from "./updateUserMcpServer";
import { deleteUserMcpServer } from "./deleteUserMcpServer";
import { McpServerSchema, ToolSchema, UserMcpServerSchema } from "@zod";
import {
  McpServerIdSchema,
  ToolIdSchema,
  UserMcpServerIdSchema,
} from "@/schema/ids";

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

export const FindAllWithMcpServerToolsOutput = z.array(
  UserMcpServerSchema.pick({
    name: true,
    createdAt: true,
    updatedAt: true,
  }).merge(
    z.object({
      id: UserMcpServerIdSchema,
      tools: z.array(ToolSchema.merge(z.object({ id: ToolIdSchema }))),
      mcpServer: McpServerSchema.merge(z.object({ id: McpServerIdSchema })),
    }),
  ),
);

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
  findAllWithMcpServerTools: protectedProcedure
    .output(FindAllWithMcpServerToolsOutput)
    .query(findAllWithMcpServerTools),
});
