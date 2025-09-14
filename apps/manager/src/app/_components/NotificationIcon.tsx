"use client";

import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type NotificationIconProps = {
  unreadCount: number;
  onClick?: () => void;
  className?: string;
};

export const NotificationIcon = ({
  unreadCount,
  onClick,
  className,
}: NotificationIconProps) => {
  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn("relative", className)}
      onClick={onClick}
      aria-label={`通知 (${unreadCount}件の未読)`}
    >
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </Button>
  );
};
