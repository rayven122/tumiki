import { z } from "zod";
import { adminProcedure, createTRPCRouter } from "@/server/api/trpc";

const PERIODS = {
  "24h": { hours: 24, bucketCount: 24, bucketMs: 60 * 60 * 1000 },
  "7d": { hours: 24 * 7, bucketCount: 7, bucketMs: 24 * 60 * 60 * 1000 },
  "30d": { hours: 24 * 30, bucketCount: 30, bucketMs: 24 * 60 * 60 * 1000 },
} as const;

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444"];

const inputSchema = z.object({
  period: z.enum(["24h", "7d", "30d"]).default("24h"),
});

const getStatus = (httpStatus: number) =>
  httpStatus >= 200 && httpStatus < 400
    ? ("success" as const)
    : httpStatus === 403
      ? ("blocked" as const)
      : ("error" as const);

const getDisplayName = (value: string | null, fallback: string) => {
  const trimmedValue = value?.trim();
  return trimmedValue && trimmedValue.length > 0 ? trimmedValue : fallback;
};

const getDeltaPercent = (current: number, previous: number) => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
};

const getPeriodRange = (period: keyof typeof PERIODS, now = new Date()) => {
  const definition = PERIODS[period];
  const from = new Date(now.getTime() - definition.hours * 60 * 60 * 1000);
  const previousFrom = new Date(
    from.getTime() - definition.hours * 60 * 60 * 1000,
  );
  return { definition, from, previousFrom, to: now };
};

const getBucketStart = (date: Date, bucketMs: number) =>
  new Date(Math.floor(date.getTime() / bucketMs) * bucketMs);

const formatBucketLabel = (date: Date, period: keyof typeof PERIODS) => {
  if (period === "24h") {
    return new Intl.DateTimeFormat("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }

  return new Intl.DateTimeFormat("ja-JP", {
    month: "2-digit",
    day: "2-digit",
  }).format(date);
};

const increment = (map: Map<string, number>, key: string, amount = 1) => {
  map.set(key, (map.get(key) ?? 0) + amount);
};

export const dashboardRouter = createTRPCRouter({
  get: adminProcedure.input(inputSchema).query(async ({ ctx, input }) => {
    const { definition, from, previousFrom, to } = getPeriodRange(input.period);

    const [
      currentLogs,
      previousLogs,
      recentLogs,
      activeUserCount,
      allServices,
    ] = await Promise.all([
      ctx.db.desktopAuditLog.findMany({
        where: { occurredAt: { gte: from, lte: to } },
        orderBy: { occurredAt: "asc" },
        select: {
          id: true,
          mcpServerId: true,
          connectionName: true,
          clientName: true,
          clientVersion: true,
          transportType: true,
          toolName: true,
          method: true,
          httpStatus: true,
          durationMs: true,
          occurredAt: true,
          userId: true,
        },
      }),
      ctx.db.desktopAuditLog.findMany({
        where: { occurredAt: { gte: previousFrom, lt: from } },
        select: {
          httpStatus: true,
        },
      }),
      ctx.db.desktopAuditLog.findMany({
        orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
        take: 6,
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
          occurredAt: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      ctx.db.user.count({ where: { isActive: true } }),
      ctx.db.desktopAuditLog.groupBy({
        by: ["mcpServerId", "connectionName"],
        _count: { _all: true },
      }),
    ]);

    const requestCount = currentLogs.length;
    const blockCount = currentLogs.filter(
      (log) => getStatus(log.httpStatus) !== "success",
    ).length;
    const previousRequestCount = previousLogs.length;
    const previousSuccessCount = previousLogs.filter(
      (log) => getStatus(log.httpStatus) === "success",
    ).length;
    const successCount = requestCount - blockCount;
    const successRate =
      requestCount > 0 ? Math.round((successCount / requestCount) * 100) : 0;
    const previousSuccessRate =
      previousRequestCount > 0
        ? Math.round((previousSuccessCount / previousRequestCount) * 100)
        : 0;

    const clientCounts = new Map<string, number>();
    const serviceCounts = new Map<string, number>();
    const serviceMeta = new Map<
      string,
      { mcpServerId: string; connectionName: string | null; lastUsedAt: Date }
    >();
    const usersWithRequests = new Set<string>();

    for (const log of currentLogs) {
      const clientName = getDisplayName(log.clientName, "不明なクライアント");
      const serviceName = getDisplayName(log.connectionName, log.mcpServerId);
      increment(clientCounts, clientName);
      increment(serviceCounts, serviceName);
      usersWithRequests.add(log.userId);

      const currentMeta = serviceMeta.get(serviceName);
      if (!currentMeta || currentMeta.lastUsedAt < log.occurredAt) {
        serviceMeta.set(serviceName, {
          mcpServerId: log.mcpServerId,
          connectionName: log.connectionName,
          lastUsedAt: log.occurredAt,
        });
      }
    }

    const topClients = Array.from(clientCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, COLORS.length)
      .map(([name, count], index) => ({
        key: `client${index}`,
        label: name,
        color: COLORS[index] ?? COLORS[0],
        count,
        percentage:
          requestCount > 0 ? Math.round((count / requestCount) * 100) : 0,
      }));

    const bucketStarts = Array.from(
      { length: definition.bucketCount },
      (_, index) =>
        getBucketStart(
          new Date(
            to.getTime() -
              (definition.bucketCount - 1 - index) * definition.bucketMs,
          ),
          definition.bucketMs,
        ),
    );
    const bucketIndexByTime = new Map(
      bucketStarts.map((bucket, index) => [bucket.getTime(), index]),
    );
    const timeline = bucketStarts.map((bucket) => ({
      label: formatBucketLabel(bucket, input.period),
      values: Object.fromEntries(topClients.map((client) => [client.key, 0])),
    }));
    const clientKeyByLabel = new Map(
      topClients.map((client) => [client.label, client.key]),
    );

    for (const log of currentLogs) {
      const clientName = getDisplayName(log.clientName, "不明なクライアント");
      const clientKey = clientKeyByLabel.get(clientName);
      if (!clientKey) continue;

      const bucketIndex = bucketIndexByTime.get(
        getBucketStart(log.occurredAt, definition.bucketMs).getTime(),
      );
      if (bucketIndex === undefined) continue;

      const point = timeline[bucketIndex];
      if (point) {
        point.values[clientKey] = (point.values[clientKey] ?? 0) + 1;
      }
    }

    const services = Array.from(serviceCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, count], index) => {
        const meta = serviceMeta.get(name);
        return {
          name,
          mcpServerId: meta?.mcpServerId ?? name,
          connectionName: meta?.connectionName ?? null,
          count,
          color: COLORS[index % COLORS.length] ?? COLORS[0],
          lastUsedAt: meta?.lastUsedAt ?? null,
        };
      });

    return {
      kpi: {
        requests: requestCount,
        requestsDelta: getDeltaPercent(requestCount, previousRequestCount),
        blocks: blockCount,
        blockRate:
          requestCount > 0 ? Math.round((blockCount / requestCount) * 100) : 0,
        successRate,
        successRateDelta: successRate - previousSuccessRate,
        connectors: allServices.length,
        connectorsActive: serviceCounts.size,
        users: activeUserCount,
        usersWithRequests: usersWithRequests.size,
      },
      series: topClients.map(({ key, label, color }) => ({
        key,
        label,
        color,
      })),
      timeline,
      aiClients: topClients.map(({ label, color, count, percentage }) => ({
        name: label,
        color,
        count,
        percentage,
      })),
      services,
      recentLogs: recentLogs.map((log) => ({
        ...log,
        status: getStatus(log.httpStatus),
      })),
    };
  }),
});
