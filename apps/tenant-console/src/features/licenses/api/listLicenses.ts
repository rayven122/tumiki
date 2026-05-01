import { type Context } from "@/server/api/trpc";
import { type ListLicensesInput } from "./schemas";
import { computeStatus } from "./utils";

export const listLicenses = async (ctx: Context, input: ListLicensesInput) => {
  const now = new Date();

  // EXPIRED は DB に持たず expiresAt で動的判定
  const statusFilter = (() => {
    if (input.status === "EXPIRED")
      return { status: "ACTIVE" as const, expiresAt: { lt: now } };
    if (input.status === "REVOKED") return { status: "REVOKED" as const };
    if (input.status === "ACTIVE")
      return { status: "ACTIVE" as const, expiresAt: { gte: now } };
    return {};
  })();

  const items = await ctx.db.license.findMany({
    where: {
      ...(input.type ? { type: input.type } : {}),
      ...(input.tenantId ? { tenantId: input.tenantId } : {}),
      ...statusFilter,
      ...(input.search
        ? {
            OR: [
              {
                subject: { contains: input.search, mode: "insensitive" },
              },
              { notes: { contains: input.search, mode: "insensitive" } },
            ],
          }
        : {}),
      // cursor は createdAt の ISO 文字列（orderBy と同じキーで一致させ、ページ境界の欠落・重複を防ぐ）
      ...(input.cursor ? { createdAt: { lt: new Date(input.cursor) } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: input.limit + 1,
  });

  const hasMore = items.length > input.limit;
  const result = hasMore ? items.slice(0, input.limit) : items;
  const nextCursor = hasMore
    ? result[result.length - 1]?.createdAt.toISOString()
    : undefined;

  return {
    items: result.map((license) => ({
      ...license,
      computedStatus: computeStatus(license),
    })),
    nextCursor,
    hasMore,
  };
};
