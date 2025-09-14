"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Info,
  Clock,
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
  ExternalLink,
  Trash2,
  Eye,
} from "lucide-react";
import type { Notification } from "@/types/notification";
import { cn } from "@/lib/utils";
import {
  NOTIFICATION_TYPE_CONFIG,
  NOTIFICATION_PRIORITY_CONFIG,
} from "@/constants/notificationConfig";
import { formatDistanceToNow, format } from "date-fns";
import { ja } from "date-fns/locale";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type NotificationDetailModalProps = {
  notification: Notification | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMarkAsRead?: (id: string) => void;
  onDelete?: (id: string) => void;
};

export const NotificationDetailModal = ({
  notification,
  open,
  onOpenChange,
  onMarkAsRead,
  onDelete,
}: NotificationDetailModalProps) => {
  const [showAbsoluteTime, setShowAbsoluteTime] = useState(false);

  const config = notification
    ? NOTIFICATION_TYPE_CONFIG[notification.type]
    : null;
  const Icon = config?.icon ?? Info;
  const priorityInfo = notification
    ? NOTIFICATION_PRIORITY_CONFIG[notification.priority]
    : null;

  const formattedTime = useMemo(() => {
    if (!notification) return "";

    if (showAbsoluteTime) {
      return format(notification.timestamp, "yyyy年MM月dd日 HH:mm:ss", {
        locale: ja,
      });
    }
    return formatDistanceToNow(notification.timestamp, {
      addSuffix: true,
      locale: ja,
    });
  }, [notification, showAbsoluteTime]);

  const trendIcon = useMemo(() => {
    if (!notification?.data?.trend) return null;

    switch (notification.data.trend) {
      case "up":
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case "down":
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      case "stable":
        return <Minus className="h-4 w-4 text-gray-500" />;
      default:
        return null;
    }
  }, [notification?.data?.trend]);

  const handleAction = useCallback(
    async (action: () => void | Promise<void>, closeModal = false) => {
      try {
        await action();
        if (closeModal) {
          onOpenChange(false);
        }
      } catch (error) {
        console.error("Action execution failed:", error);
        // TODO: トースト通知やエラー表示を実装
        alert("アクションの実行に失敗しました。再度お試しください。");
      }
    },
    [onOpenChange],
  );

  if (!notification) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-lg",
                  config?.bgColor,
                  config?.borderColor,
                  "border",
                )}
              >
                <Icon className={cn("h-5 w-5", config?.color)} />
              </div>
              <div className="flex-1">
                <DialogTitle className="text-lg font-semibold">
                  {notification.title}
                </DialogTitle>
                <div className="mt-1 flex items-center space-x-2">
                  {notification.category && (
                    <Badge variant="outline" className="text-xs">
                      {notification.category}
                    </Badge>
                  )}
                  {priorityInfo && (
                    <Badge
                      variant={priorityInfo.color}
                      className={cn("text-xs", priorityInfo.className)}
                    >
                      {priorityInfo.label}優先度
                    </Badge>
                  )}
                  {!notification.read && (
                    <Badge variant="default" className="text-xs">
                      未読
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          {/* 時刻表示 */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowAbsoluteTime(!showAbsoluteTime)}
              className="text-muted-foreground hover:text-foreground flex items-center space-x-2 text-sm transition-colors"
            >
              {showAbsoluteTime ? (
                <Calendar className="h-4 w-4" />
              ) : (
                <Clock className="h-4 w-4" />
              )}
              <span>{formattedTime}</span>
            </button>
            {notification.source && (
              <span className="text-muted-foreground text-xs">
                送信元: {notification.source}
              </span>
            )}
          </div>

          <Separator />

          {/* メッセージ */}
          <DialogDescription className="text-sm">
            {notification.message}
          </DialogDescription>

          {/* 詳細情報 */}
          {notification.details && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">詳細情報</h4>
              <ScrollArea className="h-32 rounded-md border p-3">
                <pre className="text-muted-foreground text-xs whitespace-pre-wrap">
                  {notification.details}
                </pre>
              </ScrollArea>
            </div>
          )}

          {/* データ可視化 */}
          {notification.data && (
            <div className="space-y-3">
              {/* 数値データ */}
              {notification.data.value !== undefined && (
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-1">
                    <p className="text-muted-foreground text-xs">現在の値</p>
                    <div className="flex items-center space-x-2">
                      <span className="text-2xl font-bold">
                        {notification.data.value}
                      </span>
                      {notification.data.previousValue !== undefined && (
                        <span className="text-muted-foreground text-xs">
                          (前回: {notification.data.previousValue})
                        </span>
                      )}
                      {trendIcon}
                    </div>
                  </div>
                </div>
              )}

              {/* チャートデータ */}
              {notification.data.chartData && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">推移グラフ</h4>
                  <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={notification.data.chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="label" />
                        <YAxis />
                        <Tooltip />
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke="#8884d8"
                          strokeWidth={2}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* メタデータ */}
              {notification.data.metadata && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">追加情報</h4>
                  <div className="rounded-lg border p-3">
                    {Object.entries(notification.data.metadata).map(
                      ([key, value]) => (
                        <div
                          key={key}
                          className="flex justify-between py-1 text-sm"
                        >
                          <span className="text-muted-foreground">{key}:</span>
                          <span className="font-medium">{String(value)}</span>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 関連リンク */}
          {notification.relatedUrl && (
            <div className="flex items-center space-x-2">
              <ExternalLink className="text-muted-foreground h-4 w-4" />
              <a
                href={notification.relatedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-500 hover:underline"
              >
                関連ページを開く
              </a>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
          {/* カスタムアクション */}
          {notification.actions?.map((action, index) => (
            <Button
              key={index}
              variant={action.variant ?? "default"}
              onClick={() => handleAction(action.action)}
              className="w-full sm:w-auto"
            >
              {action.label}
            </Button>
          ))}

          {/* デフォルトアクション */}
          <div className="flex w-full space-x-2 sm:w-auto">
            {!notification.read && onMarkAsRead && (
              <Button
                variant="outline"
                onClick={() => {
                  onMarkAsRead(notification.id);
                  onOpenChange(false);
                }}
                className="flex-1 sm:flex-initial"
              >
                <Eye className="mr-2 h-4 w-4" />
                既読にする
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                onClick={() => {
                  onDelete(notification.id);
                  onOpenChange(false);
                }}
                className="flex-1 sm:flex-initial"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                削除
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
