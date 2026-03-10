import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import {
  getNotifications,
  getNotificationsInputSchema,
  getNotificationsOutputSchema,
} from "./getNotifications";
import { getUnreadCount, getUnreadCountOutputSchema } from "./getUnreadCount";
import {
  markAsRead,
  markAsReadInputSchema,
  markAsReadOutputSchema,
} from "./markAsRead";
import { markAllAsRead, markAllAsReadOutputSchema } from "./markAllAsRead";
import {
  deleteNotification,
  deleteNotificationInputSchema,
  deleteNotificationOutputSchema,
} from "./deleteNotification";

export const notificationRouter = createTRPCRouter({
  // 通知一覧取得（ページネーション対応）
  getNotifications: protectedProcedure
    .input(getNotificationsInputSchema)
    .output(getNotificationsOutputSchema)
    .query(getNotifications),

  // 未読通知数取得
  getUnreadCount: protectedProcedure
    .output(getUnreadCountOutputSchema)
    .query(getUnreadCount),

  // 通知を既読にする（個別）
  markAsRead: protectedProcedure
    .input(markAsReadInputSchema)
    .output(markAsReadOutputSchema)
    .mutation(markAsRead),

  // 全通知を既読にする
  markAllAsRead: protectedProcedure
    .output(markAllAsReadOutputSchema)
    .mutation(markAllAsRead),

  // 通知を削除（論理削除）
  delete: protectedProcedure
    .input(deleteNotificationInputSchema)
    .output(deleteNotificationOutputSchema)
    .mutation(deleteNotification),
});
