import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { z } from "zod";
import { addUserOfficialServer } from "./addUserOfficialServer";
import { findAllWithMcpServerTools } from "./findAllWithTools";
import { updateServerConfig } from "./updateServerConfig";
import { deleteUserMcpServer } from "./deleteUserMcpServer";
import { McpServerSchema, ToolSchema, UserMcpServerConfigSchema } from "@zod";
import {
  McpServerIdSchema,
  ToolIdSchema,
  UserMcpServerConfigIdSchema,
  UserMcpServerInstanceIdSchema,
} from "@/schema/ids";

export const AddUserOfficialServerInput = z.object({
  mcpServerId: z.string(),
  envVars: z.record(z.string(), z.string()),
});

export const UpdateServerConfigInput = z.object({
  id: UserMcpServerInstanceIdSchema,
  envVars: z.record(z.string(), z.string()),
});

export const DeleteUserMcpServerInput = z.object({
  id: z.string(),
});

export const FindAllWithMcpServerToolsOutput = z.array(
  UserMcpServerConfigSchema.pick({
    createdAt: true,
    updatedAt: true,
  }).merge(
    z.object({
      id: UserMcpServerConfigIdSchema,
      tools: z.array(ToolSchema.merge(z.object({ id: ToolIdSchema }))),
      mcpServer: McpServerSchema.merge(z.object({ id: McpServerIdSchema })),
    }),
  ),
);

export const userMcpServerConfigRouter = createTRPCRouter({
  add: protectedProcedure
    .input(AddUserOfficialServerInput)
    .output(z.object({}))
    .mutation(addUserOfficialServer),
  update: protectedProcedure
    .input(UpdateServerConfigInput)
    .mutation(updateServerConfig),
  delete: protectedProcedure
    .input(DeleteUserMcpServerInput)
    .mutation(deleteUserMcpServer),
  findAllWithMcpServerTools: protectedProcedure
    .output(FindAllWithMcpServerToolsOutput)
    .query(findAllWithMcpServerTools),
});
