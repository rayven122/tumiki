"use client";

import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { Notification, NotificationType } from "@/types/notification";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Info,
  X,
  ExternalLink,
} from "lucide-react";

type NotificationItemProps = {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
};

// 通知タイプごとのアイコンとスタイル
const getNotificationStyle = (type: NotificationType) => {
  switch (type) {
    case "error":
      return {
        icon: AlertCircle,
        iconClass: "text-red-500",
        bgClass: "bg-red-50",
      };
    case "warning":
      return {
        icon: AlertTriangle,
        iconClass: "text-yellow-500",
        bgClass: "bg-yellow-50",
      };
    case "success":
      return {
        icon: CheckCircle,
        iconClass: "text-green-500",
        bgClass: "bg-green-50",
      };
    case "info":
    default:
      return {
        icon: Info,
        iconClass: "text-blue-500",
        bgClass: "bg-blue-50",
      };
  }
};

export const NotificationItem = ({
  notification,
  onMarkAsRead,
  onDelete,
}: NotificationItemProps) => {
  const {
    icon: Icon,
    iconClass,
    bgClass,
  } = getNotificationStyle(notification.type);

  const handleClick = () => {
    if (!notification.isRead) {
      onMarkAsRead(notification.id);
    }
    if (notification.link) {
      window.location.href = notification.link;
    }
  };

  const handleAction = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!notification.isRead) {
      onMarkAsRead(notification.id);
    }
    if (notification.actionCallback) {
      notification.actionCallback();
    } else if (notification.link) {
      window.location.href = notification.link;
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(notification.id);
  };

  return (
    <div
      className={cn(
        "group hover:bg-accent relative cursor-pointer px-4 py-3 transition-colors",
        !notification.isRead && "bg-blue-50/50",
      )}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-label={`通知: ${notification.title}`}
    >
      <div className="flex gap-3">
        <div className={cn("rounded-lg p-2", bgClass)}>
          <Icon className={cn("h-4 w-4", iconClass)} />
        </div>
        <div className="flex-1 space-y-1">
          <div className="flex items-start justify-between">
            <p
              className={cn("text-sm", !notification.isRead && "font-semibold")}
            >
              {notification.title}
            </p>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 opacity-0 transition-opacity group-hover:opacity-100"
              onClick={handleDelete}
              aria-label="通知を削除"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
          <p className="text-muted-foreground line-clamp-2 text-xs">
            {notification.message}
          </p>
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground text-xs">
              {formatDistanceToNow(notification.createdAt, {
                addSuffix: true,
                locale: ja,
              })}
            </p>
            {notification.actionLabel && (
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0 text-xs"
                onClick={handleAction}
              >
                {notification.actionLabel}
                {notification.link && <ExternalLink className="ml-1 h-3 w-3" />}
              </Button>
            )}
          </div>
        </div>
      </div>
      {!notification.isRead && (
        <div className="absolute top-1/2 left-1 h-2 w-2 -translate-y-1/2 rounded-full bg-blue-500" />
      )}
    </div>
  );
};
