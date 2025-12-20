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
import { NotificationList } from "./NotificationList";

const POLLING_INTERVAL = 30000; // 30秒

/**
 * 通知センターコンポーネント
 * - ベルアイコンと未読バッジ表示
 * - 30秒ごとに未読数をポーリング
 * - Popover で通知リストを表示
 */
export const NotificationCenter = () => {
  const [isOpen, setIsOpen] = useAtom(notificationPanelOpenAtom);

  // 未読数を取得（ポーリング）
  const { data } = api.v2.notification.getUnreadCount.useQuery(undefined, {
    refetchInterval: POLLING_INTERVAL,
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
          <Bell className="size-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex size-5 items-center justify-center rounded-full bg-red-500 text-xs font-semibold text-white">
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
