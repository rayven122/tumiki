"use client";

import { ClockIcon, CheckCircleIcon, XCircleIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface InvitationStatusProps {
  isExpired: boolean;
  expiresAt: Date;
  className?: string;
}

/**
 * 招待状況表示コンポーネント
 * 有効・期限切れの状態を視覚的に表示
 */
export const InvitationStatus = ({ 
  isExpired, 
  expiresAt, 
  className 
}: InvitationStatusProps) => {
  const now = new Date();
  const timeLeft = expiresAt.getTime() - now.getTime();
  const daysLeft = Math.ceil(timeLeft / (1000 * 60 * 60 * 24));

  if (isExpired) {
    return (
      <Badge variant="destructive" className={cn("flex items-center gap-1", className)}>
        <XCircleIcon className="size-3" />
        期限切れ
      </Badge>
    );
  }

  if (daysLeft <= 1) {
    return (
      <Badge variant="destructive" className={cn("flex items-center gap-1", className)}>
        <ClockIcon className="size-3" />
        まもなく期限切れ
      </Badge>
    );
  }

  if (daysLeft <= 3) {
    return (
      <Badge variant="outline" className={cn("flex items-center gap-1 text-orange-600 border-orange-300", className)}>
        <ClockIcon className="size-3" />
        あと{daysLeft}日
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className={cn("flex items-center gap-1 text-green-600 border-green-300", className)}>
      <CheckCircleIcon className="size-3" />
      有効（あと{daysLeft}日）
    </Badge>
  );
};