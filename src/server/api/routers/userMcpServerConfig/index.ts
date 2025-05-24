import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { z } from "zod";
import { findAllWithTools } from "./findAllWithTools";
import { updateServerConfig } from "./updateServerConfig";
import { McpServerSchema, ToolSchema, UserMcpServerConfigSchema } from "@zod";
import {
  McpServerIdSchema,
  ToolIdSchema,
  UserMcpServerConfigIdSchema,
  UserMcpServerInstanceIdSchema,
} from "@/schema/ids";

export const UpdateServerConfigInput = z.object({
  id: UserMcpServerInstanceIdSchema,
  envVars: z.record(z.string(), z.string()),
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
  findAllWithTools: protectedProcedure
    .output(FindAllWithToolsOutput)
    .query(findAllWithTools),
});
