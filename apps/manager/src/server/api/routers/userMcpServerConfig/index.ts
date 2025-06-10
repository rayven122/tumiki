import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { z } from "zod";

import { updateServerConfig } from "./updateServerConfig";
import {
  McpServerSchema,
  ToolSchema,
  UserMcpServerConfigSchema,
} from "@tumiki/db/zod";
import {
  McpServerIdSchema,
  ToolIdSchema,
  UserMcpServerConfigIdSchema,
  UserMcpServerInstanceIdSchema,
} from "@/schema/ids";
import { findServersWithTools } from "./findServersWithTools";

export const UpdateServerConfigInput = z.object({
  id: UserMcpServerInstanceIdSchema,
  envVars: z.record(z.string(), z.string()),
});

export const FindAllWithToolsInput = z.object({
  userMcpServerConfigIds: z.array(UserMcpServerConfigIdSchema).optional(),
});

export const FindAllWithToolsOutput = z.array(
  UserMcpServerConfigSchema.omit({
    envVars: true,
  }).merge(
    z.object({
      id: UserMcpServerConfigIdSchema,
      tools: z.array(ToolSchema.merge(z.object({ id: ToolIdSchema }))),
      mcpServer: McpServerSchema.merge(z.object({ id: McpServerIdSchema })),
    }),
  ),
);

export const userMcpServerConfigRouter = createTRPCRouter({
  update: protectedProcedure
    .input(UpdateServerConfigInput)
    .mutation(updateServerConfig),
  findServersWithTools: protectedProcedure
    .input(FindAllWithToolsInput)
    .output(FindAllWithToolsOutput)
    .query(findServersWithTools),
});
