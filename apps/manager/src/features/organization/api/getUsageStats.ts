import type { z } from "zod";
import type { ProtectedContext } from "@/server/api/trpc";
import { validateOrganizationAccess } from "@/server/utils/organizationPermissions";
import { usageStatsOutput } from "@/server/utils/organizationSchemas";

export const getUsageStatsOutputSchema = usageStatsOutput;

export type GetUsageStatsOutput = z.infer<typeof usageStatsOutput>;

// UTC日付を YYYY-MM-DD 形式にフォーマット
const formatUTCDate = (date: Date): string =>
  `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;

export const getUsageStats = async ({
  ctx,
}: {
  ctx: ProtectedContext;
}): Promise<GetUsageStatsOutput> => {
  // 権限を検証
  validateOrganizationAccess(ctx.currentOrg);

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const organizationId = ctx.currentOrg.id;

  // ユーザー別リクエスト集計とメンバー情報を並列取得
  const [userRequestStats, membersWithUser, dailyStats] = await Promise.all([
    // ユーザー別: リクエスト数と最終アクティビティ
    ctx.db.mcpServerRequestLog.groupBy({
      by: ["userId"],
      where: {
        organizationId,
        createdAt: { gte: thirtyDaysAgo },
      },
      _count: { id: true },
      _max: { createdAt: true },
    }),
    // メンバー情報
    ctx.db.organizationMember.findMany({
      where: { organizationId },
      include: { user: true },
    }),
    // 日別集計: Prisma groupByではDATE関数が使えないため$queryRawを使用
    ctx.db.$queryRaw<{ date: string; requests: number }[]>`
      SELECT
        TO_CHAR("created_at" AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS "date",
        COUNT(*)::int AS "requests"
      FROM "McpServerRequestLog"
      WHERE "organization_id" = ${organizationId}
        AND "created_at" >= ${thirtyDaysAgo}
      GROUP BY TO_CHAR("created_at" AT TIME ZONE 'UTC', 'YYYY-MM-DD')
      ORDER BY "date" ASC
    `,
  ]);

  // ユーザー別集計をMapに変換
  const userStatsMap = new Map(
    userRequestStats.map((stat) => [
      stat.userId,
      {
        requestCount: stat._count.id,
        lastActivity: stat._max.createdAt?.getTime() ?? null,
      },
    ]),
  );

  const totalRequests = userRequestStats.reduce(
    (sum, stat) => sum + stat._count.id,
    0,
  );

  // ユニークユーザー数はリクエストログから取得
  const uniqueUsers = userRequestStats.length;

  // メンバー統計にリクエスト数と最終アクティビティを設定
  const memberStats = membersWithUser.map((member) => {
    const stats = userStatsMap.get(member.user.id);
    return {
      user: member.user,
      requestCount: stats?.requestCount ?? 0,
      lastActivity: stats?.lastActivity ?? null,
    };
  });

  // 日別統計を30日分のデータに補完
  const dailyStatsMap = new Map(dailyStats.map((d) => [d.date, d.requests]));
  const completeDailyStats = Array.from({ length: 30 }, (_, i) => {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = formatUTCDate(date);
    return {
      date: dateStr,
      requests: dailyStatsMap.get(dateStr) ?? 0,
    };
  }).reverse();

  return {
    totalRequests,
    uniqueUsers,
    memberStats,
    dailyStats: completeDailyStats,
  };
};
