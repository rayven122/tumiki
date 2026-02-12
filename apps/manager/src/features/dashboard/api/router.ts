import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { z } from "zod";
import { subHours, startOfDay, differenceInMinutes } from "date-fns";
import { CronExpressionParser } from "cron-parser";
import {
  DashboardStatsSchema,
  RecentExecutionSchema,
  TimeRangeSchema,
  ChartDataSchema,
} from "./schemas";
import { calculateStartDate, aggregateChartData } from "./utils";

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
        nextScheduleData,
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
        // 次の実行予定（最初のアクティブスケジュールを取得）
        db.agentSchedule.findFirst({
          where: {
            agent: { organizationId },
            status: "ACTIVE",
          },
          orderBy: { createdAt: "asc" },
          select: {
            name: true,
            cronExpression: true,
            agent: {
              select: {
                name: true,
                slug: true,
              },
            },
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

      // 次の実行予定を整形（全アクティブスケジュールから最も近いものを選択）
      let nextSchedule: {
        agentName: string;
        agentSlug: string;
        scheduleName: string;
        cronExpression: string;
        nextRunAt: Date;
        minutesUntilNextRun: number;
      } | null = null;

      if (nextScheduleData) {
        // 全アクティブスケジュールを取得して最も近い実行時刻を計算
        const allActiveSchedules = await db.agentSchedule.findMany({
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
        });

        let closestSchedule: (typeof allActiveSchedules)[number] | null = null;
        let closestNextRun: Date | null = null;

        for (const schedule of allActiveSchedules) {
          try {
            const interval = CronExpressionParser.parse(
              schedule.cronExpression,
              {
                tz: schedule.timezone,
              },
            );
            const nextRun = interval.next().toDate();

            if (!closestNextRun || nextRun < closestNextRun) {
              closestNextRun = nextRun;
              closestSchedule = schedule;
            }
          } catch {
            // cron式のパースに失敗した場合はスキップ
          }
        }

        if (closestSchedule && closestNextRun) {
          nextSchedule = {
            agentName: closestSchedule.agent.name,
            agentSlug: closestSchedule.agent.slug,
            scheduleName: closestSchedule.name,
            cronExpression: closestSchedule.cronExpression,
            nextRunAt: closestNextRun,
            minutesUntilNextRun: differenceInMinutes(closestNextRun, now),
          };
        }
      }

      return {
        runningAgentCount: runningAgents,
        todayExecutionCount: todayExecutions.length,
        todaySuccessCount,
        todayErrorCount,
        mcpServerCount: mcpServers,
        todayMcpRequestCount: todayMcpRequests,
        last24hMcpRequestCount: last24hMcpRequests,
        mcpErrorRate,
        agentCount: agents,
        scheduleCount: schedules,
        // 今月のコスト（トークン使用量の記録がないため、将来対応）
        monthlyEstimatedCost: null,
        nextSchedule,
      };
    }),

  /** 最近の実行履歴を取得 */
  getRecentExecutions: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(20).default(5) }))
    .output(z.array(RecentExecutionSchema))
    .query(async ({ ctx, input }) => {
      const { db, currentOrg } = ctx;
      const organizationId = currentOrg.id;

      const executions = await db.agentExecutionLog.findMany({
        where: {
          agent: { organizationId },
          success: { not: null }, // 完了したもののみ
        },
        orderBy: { createdAt: "desc" },
        take: input.limit,
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
            },
          },
        },
      });

      return executions.map((e) => ({
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
      }));
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
});
