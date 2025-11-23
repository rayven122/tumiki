import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { findAllWithTools } from "./findAllWithTools";
import { createMcpServerTemplate } from "./create";
import z from "zod";
import {
  McpServerVisibility,
  TransportType,
  AuthType,
} from "@tumiki/db/server";
import { nameValidationSchema } from "@/schema/validation";

export const CreateMcpServerTemplateInput = z.object({
  name: nameValidationSchema,
  iconPath: z.string().optional(),
  transportType: z.nativeEnum(TransportType),
  command: z.string().optional(),
  args: z.array(z.string()).default([]),
  url: z.string().optional(),
  envVars: z.record(z.string()).default({}),
  authType: z.nativeEnum(AuthType).default("NONE"),
  visibility: z.nativeEnum(McpServerVisibility).default("PRIVATE"),
  organizationId: z.string().optional(),
});

/**
 * McpServerTemplateRouter
 * 旧: mcpServerRouter（McpServerテーブル）
 * 新: mcpServerTemplateRouter（McpServerTemplateテーブル）
 */
export const mcpServerTemplateRouter = createTRPCRouter({
  findAll: protectedProcedure.query(findAllWithTools),
  create: protectedProcedure
    .input(CreateMcpServerTemplateInput)
    .mutation(createMcpServerTemplate),
});
