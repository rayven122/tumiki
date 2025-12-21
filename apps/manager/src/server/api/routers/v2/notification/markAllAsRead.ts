import { z } from "zod";
import type { ProtectedContext } from "@/server/api/trpc";

export const markAllAsReadOutputSchema = z.object({
  count: z.number(),
});

export type MarkAllAsReadOutput = z.infer<typeof markAllAsReadOutputSchema>;

export const markAllAsRead = async ({
  ctx,
}: {
  ctx: ProtectedContext;
}): Promise<MarkAllAsReadOutput> => {
  const result = await ctx.db.notification.updateMany({
    where: {
      userId: ctx.session.user.id,
      organizationId: ctx.currentOrg.id,
      isRead: false,
      isDeleted: false,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });

  return { count: result.count };
};
