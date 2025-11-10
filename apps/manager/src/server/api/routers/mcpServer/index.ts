import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { findAllWithTools } from "./findAllWithTools";
import { createMcpServer } from "./create";
import z from "zod";
import {
  McpServerVisibility,
  TransportType,
  AuthType,
} from "@tumiki/db/server";
import { nameValidationSchema } from "@/schema/validation";

export const CreateMcpServerInput = z.object({
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

export const mcpServerRouter = createTRPCRouter({
  findAll: protectedProcedure.query(findAllWithTools),
  create: protectedProcedure
    .input(CreateMcpServerInput)
    .mutation(createMcpServer),
});
