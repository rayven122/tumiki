import { type z } from "zod";
import type { ProtectedContext } from "@/server/api/trpc";
import { validateOrganizationAccess } from "@/server/utils/organizationPermissions";
import { usageStatsOutput } from "@/server/utils/organizationSchemas";

export const getUsageStatsOutputSchema = usageStatsOutput;

export type GetUsageStatsOutput = z.infer<typeof usageStatsOutput>;

export const getUsageStats = async ({
  ctx,
}: {
  ctx: ProtectedContext;
}): Promise<GetUsageStatsOutput> => {
  // 権限を検証
  validateOrganizationAccess(ctx.currentOrg);

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const requestLogs = await ctx.db.mcpServerRequestLog.findMany({
    where: {
      organizationId: ctx.currentOrg.id,
      createdAt: {
        gte: thirtyDaysAgo,
      },
    },
  });

  const totalRequests = requestLogs.length;

  const membersWithUser = await ctx.db.organizationMember.findMany({
    where: { organizationId: ctx.currentOrg.id },
    include: { user: true },
  });

  const memberStats = membersWithUser.map((member) => {
    return {
      user: member.user,
      requestCount: 0, // リクエストログにユーザーIDがないため、0として設定
      lastActivity: null,
    };
  });

  const dailyStats = Array.from({ length: 30 }, (_, i) => {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dayStart = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
    );
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

    const dayRequests = requestLogs.filter(
      (log) => log.createdAt >= dayStart && log.createdAt < dayEnd,
    );

    return {
      date: dayStart.toISOString().split("T")[0]!,
      requests: dayRequests.length,
    };
  }).reverse();

  return {
    totalRequests,
    uniqueUsers: membersWithUser.length, // メンバー数で代替
    memberStats,
    dailyStats,
  };
};
