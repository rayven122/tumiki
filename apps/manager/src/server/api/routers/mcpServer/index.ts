import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { findAllWithTools } from "./findAllWithTools";
import { createMcpServer } from "./create";
import z from "zod";
import { McpServerVisibility, TransportType } from "@tumiki/db";

export const CreateMcpServerInput = z.object({
  name: z.string().min(1, "サーバー名は必須です"),
  iconPath: z.string().optional(),
  transportType: z.nativeEnum(TransportType),
  command: z.string().optional(),
  args: z.array(z.string()).default([]),
  url: z.string().optional(),
  envVars: z.record(z.string()).default({}),
  visibility: z.nativeEnum(McpServerVisibility).default("PRIVATE"),
  organizationId: z.string().optional(),
});

export const mcpServerRouter = createTRPCRouter({
  findAll: protectedProcedure.query(findAllWithTools),
  create: protectedProcedure
    .input(CreateMcpServerInput)
    .mutation(createMcpServer),
});
