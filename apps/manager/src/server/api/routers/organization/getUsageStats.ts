import { z } from "zod";
import type { ProtectedContext } from "@/server/api/trpc";
import { validateOrganizationAccess } from "@/server/utils/organizationPermissions";
import { getOrganizationMembersForStats } from "@/server/utils/organizationQueries";
import {
  organizationIdParamInput,
  usageStatsOutput,
} from "@/server/utils/organizationSchemas";

export const getUsageStatsInputSchema = organizationIdParamInput;
export const getUsageStatsOutputSchema = usageStatsOutput;

export type GetUsageStatsInput = z.infer<typeof organizationIdParamInput>;
export type GetUsageStatsOutput = z.infer<typeof usageStatsOutput>;

export const getUsageStats = async ({
  input,
  ctx,
}: {
  input: GetUsageStatsInput;
  ctx: ProtectedContext;
}): Promise<GetUsageStatsOutput> => {
  // 権限を検証
  await validateOrganizationAccess(
    ctx.db,
    input.organizationId,
    ctx.session.user.id,
  );

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const requestLogs = await ctx.db.mcpServerRequestLog.findMany({
    where: {
      organizationId: input.organizationId,
      createdAt: {
        gte: thirtyDaysAgo,
      },
    },
    include: {
      user: true,
    },
  });

  const totalRequests = requestLogs.length;
  const uniqueUsers = new Set(requestLogs.map((log) => log.userId)).size;

  const membersWithUser = await ctx.db.organizationMember.findMany({
    where: { organizationId: input.organizationId },
    include: { user: true },
  });

  const memberStats = membersWithUser.map((member) => {
    const memberRequests = requestLogs.filter(
      (log) => log.userId === member.userId,
    );
    return {
      user: member.user,
      requestCount: memberRequests.length,
      lastActivity:
        memberRequests.length > 0
          ? Math.max(...memberRequests.map((log) => log.createdAt.getTime()))
          : null,
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
    uniqueUsers,
    memberStats,
    dailyStats,
  };
};
