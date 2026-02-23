import { CronExpressionParser } from "cron-parser";
import { endOfDay, addDays } from "date-fns";
import type { z } from "zod";
import type { ScheduleTimelineItemSchema } from "./schemas";

/** スケジュールタイムラインの最大件数 */
const MAX_ITEMS = 20;

// 集計関数の入力型
type ScheduleInput = {
  id: string;
  name: string;
  cronExpression: string;
  timezone: string;
  agent: {
    name: string;
    slug: string;
    iconPath: string | null;
  };
};

type ScheduleRange = "today" | "week";

type ScheduleTimelineItem = z.infer<typeof ScheduleTimelineItemSchema>;

/**
 * スケジュールの実行予定タイムラインを構築する純粋関数
 *
 * - range="today": now から endOfDay(now) まで
 * - range="week": now から addDays(now, 7) まで
 * - 各スケジュールの cronExpression をパースし、range内の全実行時刻を算出
 * - 時系列（nextRunAt昇順）でソート
 * - 最大20件に制限
 * - cronパース失敗はスキップ
 */
export const buildScheduleTimeline = (
  schedules: ScheduleInput[],
  range: ScheduleRange,
  now: Date = new Date(),
): ScheduleTimelineItem[] => {
  const rangeEnd = range === "today" ? endOfDay(now) : addDays(now, 7);

  const items: ScheduleTimelineItem[] = [];

  for (const schedule of schedules) {
    try {
      const interval = CronExpressionParser.parse(schedule.cronExpression, {
        tz: schedule.timezone,
        currentDate: now,
      });

      // range内の全実行時刻を収集
      while (true) {
        const nextRun = interval.next().toDate();
        if (nextRun > rangeEnd) break;

        items.push({
          scheduleId: schedule.id,
          scheduleName: schedule.name,
          agentName: schedule.agent.name,
          agentSlug: schedule.agent.slug,
          agentIconPath: schedule.agent.iconPath,
          cronExpression: schedule.cronExpression,
          nextRunAt: nextRun,
        });
      }
    } catch {
      // 無効なcron式はスキップ
    }
  }

  // 時系列ソート（昇順）
  items.sort((a, b) => a.nextRunAt.getTime() - b.nextRunAt.getTime());

  // 最大件数に制限
  return items.slice(0, MAX_ITEMS);
};
