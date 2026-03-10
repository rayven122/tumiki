import { z } from "zod";
import type { ProtectedContext } from "@/server/api/trpc";

export const getUnreadCountOutputSchema = z.object({
  count: z.number(),
});

export type GetUnreadCountOutput = z.infer<typeof getUnreadCountOutputSchema>;

export const getUnreadCount = async ({
  ctx,
}: {
  ctx: ProtectedContext;
}): Promise<GetUnreadCountOutput> => {
  const count = await ctx.db.notification.count({
    where: {
      userId: ctx.session.user.id,
      organizationId: ctx.currentOrg.id,
      isRead: false,
      isDeleted: false,
    },
  });

  return { count };
};
