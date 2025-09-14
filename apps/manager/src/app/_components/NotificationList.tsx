"use client";

import { useState, useEffect, useCallback } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell, Check, Trash2 } from "lucide-react";
import type { Notification } from "@/types/notification";
import { NotificationDetailModal } from "./NotificationDetailModal";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import { NOTIFICATION_TYPE_CONFIG } from "@/constants/notificationConfig";

type NotificationListProps = {
  notifications: Notification[];
  onMarkAsRead?: (id: string) => void;
  onMarkAllAsRead?: () => void;
  onDelete?: (id: string) => void;
  onClearAll?: () => void;
};

export const NotificationList = ({
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onDelete,
  onClearAll,
}: NotificationListProps) => {
  const [selectedNotification, setSelectedNotification] =
    useState<Notification | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // リアルタイム更新のシミュレーション（実際の実装では WebSocket や SSE を使用）
  useEffect(() => {
    const interval = setInterval(() => {
      // 通知の更新をトリガー（実際の実装では API から取得）
      // console.log("Checking for new notifications...");
    }, 30000); // 30秒ごとにチェック

    return () => clearInterval(interval);
  }, []);

  const handleNotificationClick = useCallback((notification: Notification) => {
    setSelectedNotification(notification);
    setModalOpen(true);
    setIsOpen(false);
  }, []);

  const handleMarkAsRead = (id: string) => {
    onMarkAsRead?.(id);
  };

  const handleDelete = (id: string) => {
    onDelete?.(id);
  };

  return (
    <>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            aria-label="通知"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-96">
          <DropdownMenuLabel className="flex items-center justify-between">
            <span>通知</span>
            <div className="flex items-center space-x-1">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onMarkAllAsRead}
                  className="h-auto px-2 py-1 text-xs"
                >
                  <Check className="mr-1 h-3 w-3" />
                  すべて既読
                </Button>
              )}
              {notifications.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClearAll}
                  className="h-auto px-2 py-1 text-xs"
                >
                  <Trash2 className="mr-1 h-3 w-3" />
                  すべて削除
                </Button>
              )}
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <ScrollArea className="h-96">
            {notifications.length === 0 ? (
              <div className="text-muted-foreground flex h-32 items-center justify-center text-sm">
                通知はありません
              </div>
            ) : (
              <div className="space-y-1 p-1">
                {notifications.map((notification) => {
                  const config = NOTIFICATION_TYPE_CONFIG[notification.type];
                  const Icon = config.icon;

                  return (
                    <DropdownMenuItem
                      key={notification.id}
                      className={cn(
                        "flex cursor-pointer items-start space-x-3 p-3 transition-colors",
                        !notification.read && "bg-accent/50",
                      )}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div
                        className={cn(
                          "mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full",
                          config.bgColor,
                        )}
                      >
                        <Icon className={cn("h-4 w-4", config.color)} />
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-start justify-between">
                          <p className="text-sm leading-tight font-medium">
                            {notification.title}
                          </p>
                          {!notification.read && (
                            <div className="ml-2 h-2 w-2 flex-shrink-0 rounded-full bg-blue-500" />
                          )}
                        </div>
                        <p className="text-muted-foreground line-clamp-2 text-xs">
                          {notification.message}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground text-xs">
                            {formatDistanceToNow(notification.timestamp, {
                              addSuffix: true,
                              locale: ja,
                            })}
                          </span>
                          {notification.priority === "urgent" && (
                            <Badge
                              variant="destructive"
                              className="h-4 px-1 text-[10px]"
                            >
                              緊急
                            </Badge>
                          )}
                          {notification.priority === "high" && (
                            <Badge
                              variant="default"
                              className="h-4 bg-orange-500 px-1 text-[10px] hover:bg-orange-600"
                            >
                              高
                            </Badge>
                          )}
                        </div>
                      </div>
                    </DropdownMenuItem>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </DropdownMenuContent>
      </DropdownMenu>

      <NotificationDetailModal
        notification={selectedNotification}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onMarkAsRead={handleMarkAsRead}
        onDelete={handleDelete}
      />
    </>
  );
};
