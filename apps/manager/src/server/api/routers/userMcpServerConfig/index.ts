import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { z } from "zod";

import { updateServerConfig } from "./updateServerConfig";
import {
  McpServerTemplateSchema,
  McpToolSchema,
  McpConfigSchema,
} from "@tumiki/db/zod";
import {
  McpServerTemplateIdSchema,
  McpToolIdSchema,
  McpConfigIdSchema,
  McpServerIdSchema,
} from "@/schema/ids";
import { findServersWithTools } from "./findServersWithTools";

/**
 * 新スキーマ：mcpConfigRouter（旧userMcpServerConfigRouter）
 * - UserMcpServerConfigIdSchema → McpConfigIdSchema
 * - UserMcpServerInstanceIdSchema → McpServerIdSchema
 * - Tool → McpTool
 */
export const UpdateServerConfigInput = z.object({
  id: McpServerIdSchema, // サーバーインスタンスID
  envVars: z.record(z.string(), z.string()),
});

export const FindAllWithToolsInput = z.object({
  mcpConfigIds: z.array(McpConfigIdSchema).optional(),
});

export const FindAllWithToolsOutput = z.array(
  McpConfigSchema.omit({
    envVars: true,
  }).merge(
    z.object({
      id: McpConfigIdSchema,
      mcpTools: z.array(McpToolSchema.merge(z.object({ id: McpToolIdSchema }))),
      mcpServerTemplate: McpServerTemplateSchema.merge(
        z.object({ id: McpServerTemplateIdSchema }),
      ),
    }),
  ),
);

// 後方互換性のため旧名称も保持
export const userMcpServerConfigRouter = createTRPCRouter({
  update: protectedProcedure
    .input(UpdateServerConfigInput)
    .mutation(updateServerConfig),
  findServersWithTools: protectedProcedure
    .input(FindAllWithToolsInput)
    .output(FindAllWithToolsOutput)
    .query(findServersWithTools),
});

// 新名称でもエクスポート
export const mcpConfigRouter = userMcpServerConfigRouter;
