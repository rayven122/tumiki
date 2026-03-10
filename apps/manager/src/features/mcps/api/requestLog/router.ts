import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { z } from "zod";
import { McpServerIdSchema } from "@/schema/ids";
import {
  getRequestStats,
  getRequestStatsOutputSchema,
} from "./getRequestStats";
import {
  findRequestLogs,
  findRequestLogsOutputSchema,
} from "./findRequestLogs";
import {
  getRequestLogsStats,
  getRequestLogsStatsOutputSchema,
} from "./getRequestLogsStats";

// リクエスト統計取得の入力スキーマ
export const GetRequestStatsInput = z.object({
  userMcpServerId: McpServerIdSchema,
});

// リクエストログ取得の入力スキーマ
export const FindRequestLogsInput = z.object({
  userMcpServerId: McpServerIdSchema,
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(1000).default(50),
  // 開始日時（ISO 8601形式、タイムゾーン情報付き、必須）
  // 例: "2024-12-01T00:00:00.000+09:00"
  startDate: z.iso.datetime({ offset: true }),
  // 終了日時（ISO 8601形式、タイムゾーン情報付き、オプショナル）
  // 例: "2024-12-05T23:59:59.999+09:00"
  endDate: z.iso.datetime({ offset: true }).optional(),
  // メソッドフィルター（例: "tools/call", "tools/list"）
  method: z.string().optional(),
});

// リクエストログ統計取得の入力スキーマ
export const GetRequestLogsStatsInput = z.object({
  userMcpServerId: McpServerIdSchema,
  // 過去N日間（1〜90日）
  // 例: 7 → 過去7日間
  days: z.number().int().min(1).max(90),
  // タイムゾーン（IANAタイムゾーン名）
  // 例: "Asia/Tokyo"
  timezone: z.string().refine(
    (tz) => {
      try {
        Intl.DateTimeFormat(undefined, { timeZone: tz });
        return true;
      } catch {
        return false;
      }
    },
    { message: "無効なタイムゾーンです" },
  ),
  // 集計の粒度（日別 or 時間別）
  // "day": 日別集計（デフォルト）
  // "hour": 時間別集計（24時間表示用）
  granularity: z.enum(["day", "hour"]).default("day"),
});

export const userMcpServerRequestLogRouter = createTRPCRouter({
  // リクエスト統計取得
  getRequestStats: protectedProcedure
    .input(GetRequestStatsInput)
    .output(getRequestStatsOutputSchema)
    .query(async ({ ctx, input }) => {
      return await getRequestStats(ctx.db, {
        userMcpServerId: input.userMcpServerId,
        organizationId: ctx.currentOrg.id,
      });
    }),

  // リクエストログ取得
  findRequestLogs: protectedProcedure
    .input(FindRequestLogsInput)
    .output(findRequestLogsOutputSchema)
    .query(async ({ ctx, input }) => {
      return await findRequestLogs(ctx.db, {
        userMcpServerId: input.userMcpServerId,
        organizationId: ctx.currentOrg.id,
        page: input.page,
        pageSize: input.pageSize,
        startDate: input.startDate,
        endDate: input.endDate,
        method: input.method,
      });
    }),

  // リクエストログ統計取得（グラフ用）
  getRequestLogsStats: protectedProcedure
    .input(GetRequestLogsStatsInput)
    .output(getRequestLogsStatsOutputSchema)
    .query(async ({ ctx, input }) => {
      return await getRequestLogsStats(ctx.db, {
        userMcpServerId: input.userMcpServerId,
        organizationId: ctx.currentOrg.id,
        days: input.days,
        timezone: input.timezone,
        granularity: input.granularity,
      });
    }),
});
