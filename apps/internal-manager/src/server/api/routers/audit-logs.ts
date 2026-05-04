import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { adminProcedure, createTRPCRouter } from "@/server/api/trpc";

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 200;

const cursorSchema = z.object({
  occurredAt: z.iso.datetime({ offset: true }),
  id: z.string().min(1),
});

const encodeCursor = (cursor: z.infer<typeof cursorSchema>) =>
  Buffer.from(JSON.stringify(cursor)).toString("base64url");

const decodeCursor = (cursor: string) => {
  try {
    const decoded = JSON.parse(
      Buffer.from(cursor, "base64url").toString("utf8"),
    ) as unknown;
    const parsed = cursorSchema.safeParse(decoded);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
};

const listInputSchema = z
  .object({
    status: z.enum(["success", "blocked", "error", "all"]).default("all"),
    mcpServerId: z.string().min(1).optional(),
    from: z.iso.datetime({ offset: true }).optional(),
    to: z.iso.datetime({ offset: true }).optional(),
    limit: z.number().int().positive().max(MAX_LIMIT).default(DEFAULT_LIMIT),
    cursor: z.string().min(1).optional(),
  })
  .refine(({ from, to }) => !from || !to || new Date(from) <= new Date(to), {
    message: "from must be before or equal to to",
    path: ["from"],
  });

const getStatusWhere = (status: z.infer<typeof listInputSchema>["status"]) => {
  switch (status) {
    case "success":
      return { httpStatus: { gte: 200, lt: 400 } };
    case "blocked":
      return { httpStatus: 403 };
    case "error":
      return {
        NOT: [{ httpStatus: { gte: 200, lt: 400 } }, { httpStatus: 403 }],
      };
    case "all":
      return {};
  }
};

export const auditLogsRouter = createTRPCRouter({
  /** Desktopから同期された監査ログ一覧を取得 */
  list: adminProcedure.input(listInputSchema).query(async ({ ctx, input }) => {
    const decodedCursor = input.cursor ? decodeCursor(input.cursor) : null;
    if (input.cursor && !decodedCursor) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Invalid cursor",
      });
    }

    const baseWhere = {
      ...(input.mcpServerId ? { mcpServerId: input.mcpServerId } : {}),
      ...getStatusWhere(input.status),
      ...((input.from ?? input.to) && {
        occurredAt: {
          ...(input.from ? { gte: new Date(input.from) } : {}),
          ...(input.to ? { lte: new Date(input.to) } : {}),
        },
      }),
    };

    const where = {
      ...baseWhere,
      ...(decodedCursor && {
        OR: [
          { occurredAt: { lt: new Date(decodedCursor.occurredAt) } },
          {
            occurredAt: new Date(decodedCursor.occurredAt),
            id: { lt: decodedCursor.id },
          },
        ],
      }),
    };

    const [items, total, statusCounts, mcpServerIds] = await Promise.all([
      ctx.db.desktopAuditLog.findMany({
        where,
        orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
        take: input.limit + 1,
        select: {
          id: true,
          sourceInstallationId: true,
          sourceAuditLogId: true,
          mcpServerId: true,
          connectionName: true,
          clientName: true,
          clientVersion: true,
          transportType: true,
          toolName: true,
          method: true,
          httpStatus: true,
          durationMs: true,
          inputBytes: true,
          outputBytes: true,
          errorCode: true,
          errorSummary: true,
          occurredAt: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      ctx.db.desktopAuditLog.count({ where: baseWhere }),
      ctx.db.desktopAuditLog.groupBy({
        by: ["httpStatus"],
        _count: { _all: true },
      }),
      ctx.db.desktopAuditLog.groupBy({
        by: ["mcpServerId"],
        orderBy: { mcpServerId: "asc" },
        _count: { _all: true },
      }),
    ]);

    const pageItems = items.slice(0, input.limit);
    const lastItem = pageItems.at(-1);

    const statusSummary = statusCounts.reduce(
      (summary, count) => {
        if (count.httpStatus >= 200 && count.httpStatus < 400) {
          summary.success += count._count._all;
        } else if (count.httpStatus === 403) {
          summary.blocked += count._count._all;
        } else {
          summary.error += count._count._all;
        }
        summary.total += count._count._all;
        return summary;
      },
      { total: 0, success: 0, blocked: 0, error: 0 },
    );

    return {
      items: pageItems.map((item) => ({
        ...item,
        status:
          item.httpStatus >= 200 && item.httpStatus < 400
            ? ("success" as const)
            : item.httpStatus === 403
              ? ("blocked" as const)
              : ("error" as const),
      })),
      nextCursor:
        items.length > input.limit && lastItem
          ? encodeCursor({
              occurredAt: lastItem.occurredAt.toISOString(),
              id: lastItem.id,
            })
          : null,
      total,
      summary: statusSummary,
      mcpServers: mcpServerIds.map((server) => ({
        id: server.mcpServerId,
        count: server._count._all,
      })),
    };
  }),
});
