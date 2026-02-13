"use client";

import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import type { NotificationPriority } from "@tumiki/db/prisma";

type NotificationItemProps = {
  id: string;
  title: string;
  message: string;
  linkUrl: string | null;
  priority: NotificationPriority;
  isRead: boolean;
  createdAt: Date;
  triggeredBy: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  } | null;
  onRead?: () => void;
};

/**
 * 個別通知アイテムコンポーネント
 * - クリックで既読化 + リンク先に遷移
 * - アクションをトリガーしたユーザーのアバター表示
 * - 優先度に応じた色分け
 * - 相対時間表示
 */
export const NotificationItem = ({
  id,
  title,
  message,
  linkUrl,
  priority,
  isRead,
  createdAt,
  triggeredBy,
  onRead,
}: NotificationItemProps) => {
  const router = useRouter();
  const utils = api.useUtils();
  const markAsRead = api.notification.markAsRead.useMutation({
    onSuccess: async () => {
      await utils.notification.getNotifications.invalidate();
      await utils.notification.getUnreadCount.invalidate();
      onRead?.();
    },
  });

  const handleClick = async () => {
    // 未読の場合は既読にする
    if (!isRead) {
      await markAsRead.mutateAsync({ id });
    }

    // リンク先に遷移
    if (linkUrl) {
      router.push(linkUrl);
    }
  };

  // 優先度に応じた色分け
  const priorityColor = {
    LOW: "border-l-gray-300",
    NORMAL: "border-l-blue-500",
    HIGH: "border-l-orange-500",
    URGENT: "border-l-red-600",
  }[priority];

  // 相対時間を取得
  const relativeTime = formatDistanceToNow(new Date(createdAt), {
    addSuffix: true,
    locale: ja,
  });

  // アクターのイニシャルを取得
  const getInitials = (name: string | null, email: string | null) => {
    if (name) {
      const names = name.split(" ");
      if (names.length >= 2) {
        return `${names[0]?.[0] ?? ""}${names[1]?.[0] ?? ""}`.toUpperCase();
      }
      return name.slice(0, 2).toUpperCase();
    }
    if (email) {
      return email.slice(0, 2).toUpperCase();
    }
    return "??";
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        "hover:bg-accent w-full border-l-4 px-4 py-3 text-left transition-colors",
        priorityColor,
        !isRead && "bg-blue-50/50",
      )}
    >
      <div className="flex gap-3">
        {/* トリガーユーザーのアバター */}
        {triggeredBy && (
          <Avatar className="size-8 flex-shrink-0">
            <AvatarImage
              src={triggeredBy.image ?? undefined}
              alt={triggeredBy.name ?? triggeredBy.email ?? ""}
            />
            <AvatarFallback className="text-xs">
              {getInitials(triggeredBy.name, triggeredBy.email)}
            </AvatarFallback>
          </Avatar>
        )}

        {/* 通知内容 */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p
              className={cn("text-sm font-medium", !isRead && "font-semibold")}
            >
              {title}
            </p>
            {!isRead && (
              <div
                className="size-2 flex-shrink-0 rounded-full bg-blue-500"
                aria-label="未読"
              />
            )}
          </div>
          <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">
            {message}
          </p>
          <p className="text-muted-foreground mt-1 text-xs">{relativeTime}</p>
        </div>
      </div>
    </button>
  );
};
