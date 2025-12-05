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
export const GetRequestStatsInputV2 = z.object({
  userMcpServerId: McpServerIdSchema,
});

// リクエストログ取得の入力スキーマ
export const FindRequestLogsInputV2 = z.object({
  userMcpServerId: McpServerIdSchema,
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(1000).default(50),
  // 開始日時（ISO 8601形式、タイムゾーン情報付き、必須）
  // 例: "2024-12-01T00:00:00.000+09:00"
  startDate: z.iso.datetime({ offset: true }),
  // 終了日時（ISO 8601形式、タイムゾーン情報付き、オプショナル）
  // 例: "2024-12-05T23:59:59.999+09:00"
  endDate: z.iso.datetime({ offset: true }).optional(),
});

// リクエストログ統計取得の入力スキーマ
export const GetRequestLogsStatsInputV2 = z.object({
  userMcpServerId: McpServerIdSchema,
  // 開始日時（ISO 8601形式、タイムゾーン情報付き）
  // 例: "2024-12-01T00:00:00.000+09:00"
  startDate: z.iso.datetime({ offset: true }),
  // 終了日時（ISO 8601形式、タイムゾーン情報付き）
  // 例: "2024-12-05T23:59:59.999+09:00"
  endDate: z.iso.datetime({ offset: true }),
});

export const userMcpServerRequestLogRouter = createTRPCRouter({
  // リクエスト統計取得
  getRequestStats: protectedProcedure
    .input(GetRequestStatsInputV2)
    .output(getRequestStatsOutputSchema)
    .query(async ({ ctx, input }) => {
      return await getRequestStats(ctx.db, {
        userMcpServerId: input.userMcpServerId,
        organizationId: ctx.session.user.organizationId,
      });
    }),

  // リクエストログ取得
  findRequestLogs: protectedProcedure
    .input(FindRequestLogsInputV2)
    .output(findRequestLogsOutputSchema)
    .query(async ({ ctx, input }) => {
      return await findRequestLogs(ctx.db, {
        userMcpServerId: input.userMcpServerId,
        organizationId: ctx.session.user.organizationId,
        page: input.page,
        pageSize: input.pageSize,
        startDate: input.startDate,
        endDate: input.endDate,
      });
    }),

  // リクエストログ統計取得（グラフ用）
  getRequestLogsStats: protectedProcedure
    .input(GetRequestLogsStatsInputV2)
    .output(getRequestLogsStatsOutputSchema)
    .query(async ({ ctx, input }) => {
      return await getRequestLogsStats(ctx.db, {
        userMcpServerId: input.userMcpServerId,
        organizationId: ctx.session.user.organizationId,
        startDate: input.startDate,
        endDate: input.endDate,
      });
    }),
});
