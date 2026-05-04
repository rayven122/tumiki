import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  McpCatalogAuthType,
  McpCatalogStatus,
  McpCatalogTransportType,
  McpToolRiskLevel,
} from "@tumiki/internal-db";
import type { Prisma } from "@tumiki/internal-db";
import { adminProcedure, createTRPCRouter } from "@/server/api/trpc";

const slugSchema = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/);

const jsonRecordSchema = z.record(z.string(), z.unknown());
const toInputJson = (value: Record<string, unknown>): Prisma.InputJsonValue =>
  value as Prisma.InputJsonValue;

const MCP_CATALOG_LIST_LIMIT = 200;

export const mcpCatalogRouter = createTRPCRouter({
  list: adminProcedure.query(async ({ ctx }) => {
    return ctx.db.mcpCatalog.findMany({
      where: { deletedAt: null },
      include: {
        tools: {
          where: { deletedAt: null },
          orderBy: { name: "asc" },
        },
      },
      orderBy: [{ name: "asc" }, { id: "asc" }],
      take: MCP_CATALOG_LIST_LIMIT,
    });
  }),

  create: adminProcedure
    .input(
      z.object({
        slug: slugSchema,
        name: z.string().min(1).max(120),
        description: z.string().max(1000).optional(),
        transportType: z
          .nativeEnum(McpCatalogTransportType)
          .default(McpCatalogTransportType.STDIO),
        authType: z
          .nativeEnum(McpCatalogAuthType)
          .default(McpCatalogAuthType.NONE),
        iconPath: z.string().max(500).optional(),
        configTemplate: jsonRecordSchema.default({}),
        credentialKeys: z.array(z.string().min(1).max(120)).default([]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.mcpCatalog.create({
        data: {
          ...input,
          description: input.description ?? null,
          iconPath: input.iconPath ?? null,
          configTemplate: toInputJson(input.configTemplate),
          createdBy: ctx.session.user.id,
        },
        include: { tools: true },
      });
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.string().min(1),
        name: z.string().min(1).max(120),
        description: z.string().max(1000).nullable(),
        transportType: z.nativeEnum(McpCatalogTransportType),
        authType: z.nativeEnum(McpCatalogAuthType),
        status: z.nativeEnum(McpCatalogStatus),
        iconPath: z.string().max(500).nullable(),
        configTemplate: jsonRecordSchema,
        credentialKeys: z.array(z.string().min(1).max(120)),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const catalog = await ctx.db.mcpCatalog.findFirst({
        where: { id, deletedAt: null },
        select: { id: true },
      });
      if (!catalog) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "カタログが見つかりません",
        });
      }

      return ctx.db.mcpCatalog.update({
        where: { id },
        data: {
          ...data,
          configTemplate: toInputJson(data.configTemplate),
        },
        include: { tools: { where: { deletedAt: null } } },
      });
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const catalog = await ctx.db.mcpCatalog.findFirst({
        where: { id: input.id, deletedAt: null },
        select: { id: true },
      });
      if (!catalog) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "カタログが見つかりません",
        });
      }

      await ctx.db.mcpCatalog.update({
        where: { id: input.id },
        data: { deletedAt: new Date(), status: McpCatalogStatus.DISABLED },
      });
      return { ok: true };
    }),

  refreshTools: adminProcedure
    .input(
      z.object({
        catalogId: z.string().min(1),
        tools: z
          .array(
            z.object({
              name: z.string().min(1).max(180),
              description: z.string().max(1000).optional(),
              inputSchema: jsonRecordSchema.default({}),
              defaultAllowed: z.boolean().default(false),
              riskLevel: z
                .nativeEnum(McpToolRiskLevel)
                .default(McpToolRiskLevel.MEDIUM),
            }),
          )
          .max(500),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.$transaction(async (tx) => {
        const catalog = await tx.mcpCatalog.findFirst({
          where: { id: input.catalogId, deletedAt: null },
          select: { id: true },
        });
        if (!catalog) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "カタログが見つかりません",
          });
        }

        const seenNames = new Set(input.tools.map((tool) => tool.name));
        await tx.mcpCatalogTool.updateMany({
          where: {
            catalogId: input.catalogId,
            name: { notIn: [...seenNames] },
            deletedAt: null,
          },
          data: { deletedAt: new Date() },
        });
        for (const tool of input.tools) {
          await tx.mcpCatalogTool.upsert({
            where: {
              catalogId_name: {
                catalogId: input.catalogId,
                name: tool.name,
              },
            },
            create: {
              catalogId: input.catalogId,
              name: tool.name,
              description: tool.description ?? null,
              inputSchema: toInputJson(tool.inputSchema),
              defaultAllowed: tool.defaultAllowed,
              riskLevel: tool.riskLevel,
            },
            update: {
              description: tool.description ?? null,
              inputSchema: toInputJson(tool.inputSchema),
              defaultAllowed: tool.defaultAllowed,
              riskLevel: tool.riskLevel,
              deletedAt: null,
            },
          });
        }
        return tx.mcpCatalog.findUniqueOrThrow({
          where: { id: input.catalogId },
          include: { tools: { where: { deletedAt: null } } },
        });
      });
    }),
});
