import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { z } from "zod";
import {
  subDays,
  subHours,
  startOfDay,
  format,
  eachDayOfInterval,
  eachHourOfInterval,
  differenceInMinutes,
} from "date-fns";
import { CronExpressionParser } from "cron-parser";

// 次の実行予定スキーマ
const NextScheduleSchema = z
  .object({
    agentName: z.string(),
    agentSlug: z.string(),
    scheduleName: z.string(),
    cronExpression: z.string(),
    nextRunAt: z.date(),
    minutesUntilNextRun: z.number(),
  })
  .nullable();

// ダッシュボード統計のレスポンススキーマ
const DashboardStatsSchema = z.object({
  // エージェント統計
  runningAgentCount: z.number(),
  todayExecutionCount: z.number(),
  todaySuccessCount: z.number(),
  todayErrorCount: z.number(),
  // MCP統計
  mcpServerCount: z.number(),
  todayMcpRequestCount: z.number(),
  last24hMcpRequestCount: z.number(),
  mcpErrorRate: z.number(),
  // 組織統計
  agentCount: z.number(),
  scheduleCount: z.number(),
  // 今月のコスト（将来対応、現在は未実装）
  monthlyEstimatedCost: z.number().nullable(),
  // 次の実行予定
  nextSchedule: NextScheduleSchema,
});

// 最近の実行履歴スキーマ
const RecentExecutionSchema = z.object({
  id: z.string(),
  agentId: z.string(),
  agentName: z.string(),
  agentSlug: z.string(),
  agentIconPath: z.string().nullable(),
  success: z.boolean().nullable(),
  durationMs: z.number().nullable(),
  createdAt: z.date(),
  modelId: z.string().nullable(),
  scheduleName: z.string().nullable(),
  chatId: z.string().nullable(),
});

// 時間範囲スキーマ
const TimeRangeSchema = z.enum(["24h", "7d", "30d"]);
type TimeRange = z.infer<typeof TimeRangeSchema>;

// グラフデータポイントスキーマ
const ChartDataPointSchema = z.object({
  label: z.string(),
  count: z.number(),
  successCount: z.number(),
  errorCount: z.number(),
});

// グラフデータスキーマ
const ChartDataSchema = z.object({
  data: z.array(ChartDataPointSchema),
  total: z.number(),
  successTotal: z.number(),
  errorTotal: z.number(),
});

// 集計用のデータポイント型
type DataPoint = { count: number; successCount: number; errorCount: number };

// 時間範囲から開始日時を計算
const calculateStartDate = (timeRange: TimeRange, now: Date): Date => {
  switch (timeRange) {
    case "24h":
      return subHours(now, 24);
    case "7d":
      return subDays(now, 7);
    case "30d":
      return subDays(now, 30);
  }
};

// 空のデータポイントを初期化したMapを生成
const initializeDataMap = (
  timeRange: TimeRange,
  startDate: Date,
  now: Date,
): Map<string, DataPoint> => {
  const dataMap = new Map<string, DataPoint>();
  const emptyDataPoint = (): DataPoint => ({
    count: 0,
    successCount: 0,
    errorCount: 0,
  });

  if (timeRange === "24h") {
    eachHourOfInterval({ start: startDate, end: now }).forEach((hour) => {
      dataMap.set(format(hour, "HH"), emptyDataPoint());
    });
  } else {
    eachDayOfInterval({ start: startDate, end: now }).forEach((day) => {
      dataMap.set(format(day, "M/d"), emptyDataPoint());
    });
  }

  return dataMap;
};

// 日時からラベルを生成
const formatLabel = (date: Date, isHourly: boolean): string =>
  isHourly ? format(date, "HH") : format(date, "M/d");

// Mapを配列に変換し集計結果を返す
const buildChartResult = (
  dataMap: Map<string, DataPoint>,
  totals: { total: number; successTotal: number; errorTotal: number },
) => ({
  data: Array.from(dataMap.entries()).map(([label, stats]) => ({
    label,
    ...stats,
  })),
  ...totals,
});

/**
 * ログ配列を集計してグラフデータを生成
 *
 * @param logs - 集計対象のログ配列
 * @param timeRange - 時間範囲
 * @param isSuccess - 成功判定関数
 */
const aggregateChartData = <T extends { createdAt: Date }>(
  logs: T[],
  timeRange: TimeRange,
  isSuccess: (log: T) => boolean,
) => {
  const now = new Date();
  const isHourly = timeRange === "24h";
  const startDate = calculateStartDate(timeRange, now);
  const dataMap = initializeDataMap(timeRange, startDate, now);

  let total = 0;
  let successTotal = 0;
  let errorTotal = 0;

  for (const log of logs) {
    const label = formatLabel(log.createdAt, isHourly);
    const existing = dataMap.get(label);
    if (!existing) continue;

    existing.count++;
    total++;

    if (isSuccess(log)) {
      existing.successCount++;
      successTotal++;
    } else {
      existing.errorCount++;
      errorTotal++;
    }
  }

  return buildChartResult(dataMap, { total, successTotal, errorTotal });
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
