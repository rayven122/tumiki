import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { z } from "zod";
import {
  subHours,
  subDays,
  subMonths,
  startOfDay,
  startOfMonth,
  differenceInMinutes,
} from "date-fns";
import { calculateTokenCost } from "./tokenPricing";
import { CronExpressionParser } from "cron-parser";
import {
  DashboardStatsSchema,
  PaginatedRecentExecutionsSchema,
  RecentExecutionSortKeySchema,
  RecentExecutionSortDirectionSchema,
  TimeRangeSchema,
  ChartDataSchema,
  PiiStatsSchema,
  AgentPerformanceSchema,
  McpServerHealthSchema,
  ScheduleTimelineSchema,
  ScheduleRangeSchema,
  CostTrendDataSchema,
  AgentCostBreakdownSchema,
} from "./schemas";
import type { NextSchedule } from "./schemas";
import { calculateStartDate, aggregateChartData } from "./utils";
import { aggregateAgentPerformance } from "./aggregateAgentPerformance";
import { aggregateMcpServerHealth } from "./aggregateMcpServerHealth";
import { buildScheduleTimeline } from "./buildScheduleTimeline";
import { aggregateCostTrendData } from "./aggregateCostTrendData";
import { aggregateAgentCostBreakdown } from "./aggregateAgentCostBreakdown";

// トークン集計結果からコストを推計（トークンがゼロならnull）
const estimateTokenCost = (sum: {
  inputTokens: number | null;
  outputTokens: number | null;
}): number | null => {
  const input = sum.inputTokens ?? 0;
  const output = sum.outputTokens ?? 0;
  if (input === 0 && output === 0) return null;
  return calculateTokenCost(input, output);
};

// アクティブスケジュール一覧から最も近い次回実行予定を取得
type ScheduleWithAgent = {
  name: string;
  cronExpression: string;
  timezone: string;
  agent: { name: string; slug: string };
};

const findNextSchedule = (
  activeSchedules: ScheduleWithAgent[],
  now: Date,
): NextSchedule => {
  let closestSchedule: ScheduleWithAgent | null = null;
  let closestNextRun: Date | null = null;

  for (const schedule of activeSchedules) {
    try {
      const interval = CronExpressionParser.parse(schedule.cronExpression, {
        tz: schedule.timezone,
      });
      const nextRun = interval.next().toDate();

      if (!closestNextRun || nextRun < closestNextRun) {
        closestNextRun = nextRun;
        closestSchedule = schedule;
      }
    } catch {
      // cron式のパースに失敗した場合はスキップ
    }
  }

  if (!closestSchedule || !closestNextRun) return null;

  return {
    agentName: closestSchedule.agent.name,
    agentSlug: closestSchedule.agent.slug,
    scheduleName: closestSchedule.name,
    cronExpression: closestSchedule.cronExpression,
    nextRunAt: closestNextRun,
    minutesUntilNextRun: differenceInMinutes(closestNextRun, now),
  };
};

export const dashboardRouter = createTRPCRouter({
  /** ダッシュボード統計を取得 */
  getStats: protectedProcedure
    .output(DashboardStatsSchema)
    .query(async ({ ctx }) => {
      const { db, currentOrg } = ctx;
      const organizationId = currentOrg.id;

      const now = new Date();
      const todayStart = startOfDay(now);
      const last24h = subHours(now, 24);

      const monthStart = startOfMonth(now);
      const yesterdayStart = startOfDay(subDays(now, 1));
      const lastMonthStart = startOfMonth(subMonths(now, 1));

      // 並列でデータを取得
      const [
        runningAgents,
        todayExecutions,
        mcpServers,
        todayMcpRequests,
        last24hMcpRequests,
        mcpErrors,
        agents,
        schedules,
        activeSchedules,
        monthlyTokens,
        yesterdayExecutionCount,
        lastMonthTokens,
      ] = await Promise.all([
        // 稼働中エージェント数（success === null）
        db.agentExecutionLog.count({
          where: {
            agent: { organizationId },
            success: null,
          },
        }),
        // 今日の実行（完了したもののみ）
        db.agentExecutionLog.findMany({
          where: {
            agent: { organizationId },
            createdAt: { gte: todayStart },
            success: { not: null },
          },
          select: { success: true },
        }),
        // MCPサーバー数
        db.mcpServer.count({
          where: { organizationId, deletedAt: null },
        }),
        // 今日のMCPリクエスト数
        db.mcpServerRequestLog.count({
          where: {
            organizationId,
            createdAt: { gte: todayStart },
          },
        }),
        // 過去24時間のMCPリクエスト数
        db.mcpServerRequestLog.count({
          where: {
            organizationId,
            createdAt: { gte: last24h },
          },
        }),
        // MCPエラー数（過去24時間）
        db.mcpServerRequestLog.count({
          where: {
            organizationId,
            createdAt: { gte: last24h },
            httpStatus: { gte: 400 },
          },
        }),
        // エージェント数
        db.agent.count({
          where: { organizationId },
        }),
        // アクティブなスケジュール数
        db.agentSchedule.count({
          where: {
            agent: { organizationId },
            status: "ACTIVE",
          },
        }),
        // アクティブスケジュール一覧（次の実行予定の計算用）
        db.agentSchedule.findMany({
          where: {
            agent: { organizationId },
            status: "ACTIVE",
          },
          select: {
            name: true,
            cronExpression: true,
            timezone: true,
            agent: {
              select: {
                name: true,
                slug: true,
              },
            },
          },
        }),
        // 今月のトークン使用量
        db.mcpServerRequestLog.aggregate({
          where: {
            organizationId,
            createdAt: { gte: monthStart },
          },
          _sum: {
            inputTokens: true,
            outputTokens: true,
          },
        }),
        // 昨日の実行数（完了したもののみ）
        db.agentExecutionLog.count({
          where: {
            agent: { organizationId },
            createdAt: { gte: yesterdayStart, lt: todayStart },
            success: { not: null },
          },
        }),
        // 先月のトークン使用量
        db.mcpServerRequestLog.aggregate({
          where: {
            organizationId,
            createdAt: { gte: lastMonthStart, lt: monthStart },
          },
          _sum: {
            inputTokens: true,
            outputTokens: true,
          },
        }),
      ]);

      const todaySuccessCount = todayExecutions.filter(
        (e) => e.success === true,
      ).length;
      const todayErrorCount = todayExecutions.filter(
        (e) => e.success === false,
      ).length;

      // MCPエラー率を計算（過去24時間）
      const mcpErrorRate =
        last24hMcpRequests > 0
          ? Math.round((mcpErrors / last24hMcpRequests) * 1000) / 10
          : 0;

      const nextSchedule = findNextSchedule(activeSchedules, now);
      const monthlyEstimatedCost = estimateTokenCost(monthlyTokens._sum);
      const lastMonthEstimatedCost = estimateTokenCost(lastMonthTokens._sum);

      return {
        runningAgentCount: runningAgents,
        todayExecutionCount: todayExecutions.length,
        todaySuccessCount,
        todayErrorCount,
        yesterdayExecutionCount,
        mcpServerCount: mcpServers,
        todayMcpRequestCount: todayMcpRequests,
        last24hMcpRequestCount: last24hMcpRequests,
        mcpErrorRate,
        agentCount: agents,
        scheduleCount: schedules,
        monthlyEstimatedCost,
        lastMonthEstimatedCost,
        nextSchedule,
      };
    }),

  /** 最近の実行履歴を取得（ページネーション付き） */
  getRecentExecutions: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(50).default(10),
        sortKey: RecentExecutionSortKeySchema.default("createdAt"),
        sortDirection: RecentExecutionSortDirectionSchema.default("desc"),
      }),
    )
    .output(PaginatedRecentExecutionsSchema)
    .query(async ({ ctx, input }) => {
      const { db, currentOrg } = ctx;
      const organizationId = currentOrg.id;
      const { page, pageSize, sortKey, sortDirection } = input;

      const where = {
        agent: { organizationId },
        success: { not: null } as const, // 完了したもののみ
      };

      const [executions, totalCount] = await Promise.all([
        db.agentExecutionLog.findMany({
          where,
          orderBy: { [sortKey]: sortDirection },
          skip: (page - 1) * pageSize,
          take: pageSize,
          select: {
            id: true,
            agentId: true,
            success: true,
            durationMs: true,
            createdAt: true,
            modelId: true,
            chatId: true,
            schedule: {
              select: {
                name: true,
              },
            },
            agent: {
              select: {
                name: true,
                slug: true,
                iconPath: true,
                mcpServers: {
                  where: { deletedAt: null },
                  select: {
                    id: true,
                    iconPath: true,
                    templateInstances: {
                      take: 1,
                      select: {
                        mcpServerTemplate: {
                          select: { iconPath: true },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        }),
        db.agentExecutionLog.count({ where }),
      ]);

      return {
        items: executions.map((e) => ({
          id: e.id,
          agentId: e.agentId,
          agentName: e.agent.name,
          agentSlug: e.agent.slug,
          agentIconPath: e.agent.iconPath,
          success: e.success,
          durationMs: e.durationMs,
          createdAt: e.createdAt,
          modelId: e.modelId,
          scheduleName: e.schedule?.name ?? null,
          chatId: e.chatId,
          mcpServerIcons: e.agent.mcpServers.map((s) => ({
            id: s.id,
            iconPath:
              s.iconPath ??
              s.templateInstances[0]?.mcpServerTemplate?.iconPath ??
              null,
          })),
        })),
        totalCount,
        totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
        currentPage: page,
      };
    }),

  /** MCPリクエストのグラフデータを取得 */
  getMcpChartData: protectedProcedure
    .input(z.object({ timeRange: TimeRangeSchema }))
    .output(ChartDataSchema)
    .query(async ({ ctx, input }) => {
      const { db, currentOrg } = ctx;
      const { timeRange } = input;
      const startDate = calculateStartDate(timeRange, new Date());

      const logs = await db.mcpServerRequestLog.findMany({
        where: {
          organizationId: currentOrg.id,
          createdAt: { gte: startDate },
        },
        select: {
          createdAt: true,
          httpStatus: true,
        },
      });

      // HTTPステータス200-399を成功とみなす
      return aggregateChartData(
        logs,
        timeRange,
        (log) =>
          log.httpStatus !== null &&
          log.httpStatus >= 200 &&
          log.httpStatus < 400,
      );
    }),

  /** エージェント実行のグラフデータを取得 */
  getAgentChartData: protectedProcedure
    .input(z.object({ timeRange: TimeRangeSchema }))
    .output(ChartDataSchema)
    .query(async ({ ctx, input }) => {
      const { db, currentOrg } = ctx;
      const { timeRange } = input;
      const startDate = calculateStartDate(timeRange, new Date());

      const logs = await db.agentExecutionLog.findMany({
        where: {
          agent: { organizationId: currentOrg.id },
          createdAt: { gte: startDate },
          success: { not: null },
        },
        select: {
          createdAt: true,
          success: true,
        },
      });

      // success === true を成功とみなす
      return aggregateChartData(logs, timeRange, (log) => log.success === true);
    }),

  /** PII検知統計を取得 */
  getPiiStats: protectedProcedure
    .input(z.object({ timeRange: TimeRangeSchema }))
    .output(PiiStatsSchema)
    .query(async ({ ctx, input }) => {
      const { db, currentOrg } = ctx;
      const { timeRange } = input;
      const startDate = calculateStartDate(timeRange, new Date());
      const organizationId = currentOrg.id;

      // PII検知の集計とマスキング有効リクエスト数を並列取得
      const piiWhere = {
        organizationId,
        createdAt: { gte: startDate },
        piiMaskingMode: { not: "DISABLED" } as const,
      };

      const [piiAggregate, maskedRequestCount, piiLogs] = await Promise.all([
        db.mcpServerRequestLog.aggregate({
          where: piiWhere,
          _sum: {
            piiDetectedRequestCount: true,
            piiDetectedResponseCount: true,
          },
        }),
        db.mcpServerRequestLog.count({ where: piiWhere }),
        db.mcpServerRequestLog.findMany({
          where: piiWhere,
          select: {
            createdAt: true,
            piiDetectedRequestCount: true,
            piiDetectedResponseCount: true,
            piiDetectedInfoTypes: true,
          },
        }),
      ]);

      const requestDetections = piiAggregate._sum.piiDetectedRequestCount ?? 0;
      const responseDetections =
        piiAggregate._sum.piiDetectedResponseCount ?? 0;

      // InfoType別内訳を集計
      const infoTypeCounts = new Map<string, number>();
      for (const log of piiLogs) {
        for (const infoType of log.piiDetectedInfoTypes) {
          infoTypeCounts.set(infoType, (infoTypeCounts.get(infoType) ?? 0) + 1);
        }
      }
      const infoTypeBreakdown = Array.from(infoTypeCounts.entries())
        .map(([infoType, count]) => ({ infoType, count }))
        .sort((a, b) => b.count - a.count);

      // トレンドデータ: PII検知ありのリクエストを「成功」として集計
      const trendData = aggregateChartData(
        piiLogs,
        timeRange,
        (log) =>
          (log.piiDetectedRequestCount ?? 0) +
            (log.piiDetectedResponseCount ?? 0) >
          0,
      );

      return {
        totalDetections: requestDetections + responseDetections,
        requestDetections,
        responseDetections,
        maskedRequestCount,
        infoTypeBreakdown,
        trendData,
      };
    }),

  /** エージェント別パフォーマンスを取得 */
  getAgentPerformance: protectedProcedure
    .input(z.object({ timeRange: TimeRangeSchema }))
    .output(AgentPerformanceSchema)
    .query(async ({ ctx, input }) => {
      const { db, currentOrg } = ctx;
      const { timeRange } = input;
      const startDate = calculateStartDate(timeRange, new Date());

      const [agents, executionLogs] = await Promise.all([
        // 組織内の全エージェント
        db.agent.findMany({
          where: { organizationId: currentOrg.id },
          select: {
            id: true,
            name: true,
            slug: true,
            iconPath: true,
          },
        }),
        // 期間内の完了した実行ログ
        db.agentExecutionLog.findMany({
          where: {
            agent: { organizationId: currentOrg.id },
            createdAt: { gte: startDate },
            success: { not: null },
          },
          select: {
            agentId: true,
            success: true,
            durationMs: true,
            createdAt: true,
          },
        }),
      ]);

      return {
        agents: aggregateAgentPerformance(agents, executionLogs),
      };
    }),

  /** MCPサーバーヘルスを取得（過去24h固定） */
  getMcpServerHealth: protectedProcedure
    .output(McpServerHealthSchema)
    .query(async ({ ctx }) => {
      const { db, currentOrg } = ctx;
      const organizationId = currentOrg.id;
      const last24h = subHours(new Date(), 24);

      const [servers, requestLogs] = await Promise.all([
        db.mcpServer.findMany({
          where: { organizationId, deletedAt: null },
          select: {
            id: true,
            name: true,
            slug: true,
            iconPath: true,
            serverStatus: true,
            templateInstances: {
              take: 1,
              select: {
                mcpServerTemplate: {
                  select: { iconPath: true },
                },
              },
            },
          },
        }),
        db.mcpServerRequestLog.findMany({
          where: {
            organizationId,
            createdAt: { gte: last24h },
          },
          select: {
            mcpServerId: true,
            httpStatus: true,
            durationMs: true,
          },
        }),
      ]);

      return {
        servers: aggregateMcpServerHealth(servers, requestLogs),
      };
    }),

  /** スケジュールタイムラインを取得 */
  getScheduleTimeline: protectedProcedure
    .input(z.object({ range: ScheduleRangeSchema }))
    .output(ScheduleTimelineSchema)
    .query(async ({ ctx, input }) => {
      const { db, currentOrg } = ctx;

      const schedules = await db.agentSchedule.findMany({
        where: {
          agent: { organizationId: currentOrg.id },
          status: "ACTIVE",
        },
        select: {
          id: true,
          name: true,
          cronExpression: true,
          timezone: true,
          agent: {
            select: {
              name: true,
              slug: true,
              iconPath: true,
            },
          },
        },
      });

      return {
        items: buildScheduleTimeline(schedules, input.range),
      };
    }),

  /** コスト推移データを取得 */
  getCostTrendData: protectedProcedure
    .input(z.object({ timeRange: TimeRangeSchema }))
    .output(CostTrendDataSchema)
    .query(async ({ ctx, input }) => {
      const { db, currentOrg } = ctx;
      const { timeRange } = input;
      const startDate = calculateStartDate(timeRange, new Date());

      const logs = await db.mcpServerRequestLog.findMany({
        where: {
          organizationId: currentOrg.id,
          createdAt: { gte: startDate },
        },
        select: {
          createdAt: true,
          inputTokens: true,
          outputTokens: true,
        },
      });

      return aggregateCostTrendData(logs, timeRange);
    }),

  /** エージェント別コスト内訳を取得 */
  getAgentCostBreakdown: protectedProcedure
    .input(z.object({ timeRange: TimeRangeSchema }))
    .output(AgentCostBreakdownSchema)
    .query(async ({ ctx, input }) => {
      const { db, currentOrg } = ctx;
      const { timeRange } = input;
      const organizationId = currentOrg.id;
      const startDate = calculateStartDate(timeRange, new Date());

      // MCPサーバーごとのトークン集計とエージェント情報を並列取得
      const [mcpServerTokens, agents] = await Promise.all([
        db.mcpServerRequestLog.groupBy({
          by: ["mcpServerId"],
          where: {
            organizationId,
            createdAt: { gte: startDate },
          },
          _sum: {
            inputTokens: true,
            outputTokens: true,
          },
        }),
        db.agent.findMany({
          where: { organizationId },
          select: {
            id: true,
            name: true,
            slug: true,
            iconPath: true,
            modelId: true,
            mcpServers: {
              where: { deletedAt: null },
              select: { id: true },
            },
          },
        }),
      ]);

      return aggregateAgentCostBreakdown(
        agents.map((a) => ({
          ...a,
          modelId: a.modelId ?? null,
          mcpServerIds: a.mcpServers.map((s) => s.id),
        })),
        mcpServerTokens.map((t) => ({
          mcpServerId: t.mcpServerId,
          inputTokens: t._sum.inputTokens ?? 0,
          outputTokens: t._sum.outputTokens ?? 0,
        })),
      );
    }),
});
