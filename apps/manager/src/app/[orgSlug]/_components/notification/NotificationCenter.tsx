"use client";

import { Bell } from "lucide-react";
import { useAtom } from "jotai";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { api } from "@/trpc/react";
import { notificationPanelOpenAtom } from "@/store/notification";
import { useAdaptivePolling } from "@/hooks/useAdaptivePolling";
import { NotificationList } from "./NotificationList";

/**
 * 通知センターコンポーネント
 * - ベルアイコンと未読バッジ表示
 * - アダプティブなポーリング間隔で未読数を取得（アクティブ時30秒、非アクティブ時2分）
 * - Popover で通知リストを表示
 */
export const NotificationCenter = () => {
  const [isOpen, setIsOpen] = useAtom(notificationPanelOpenAtom);

  // アダプティブなポーリング間隔を取得
  const pollingInterval = useAdaptivePolling();

  // 未読数を取得（アダプティブポーリング）
  const { data } = api.notification.getUnreadCount.useQuery(undefined, {
    refetchInterval: pollingInterval || false,
    refetchOnWindowFocus: true,
  });

  const unreadCount = data?.count ?? 0;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={`通知センター${unreadCount > 0 ? ` - ${unreadCount}件の未読通知` : ""}`}
        >
          <Bell className="size-6" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-semibold text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] max-w-[90vw] p-0" align="end">
        <NotificationList onClose={() => setIsOpen(false)} />
      </PopoverContent>
    </Popover>
  );
};
