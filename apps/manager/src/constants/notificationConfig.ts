import {
  AlertCircle,
  CheckCircle,
  Info,
  AlertTriangle,
  XCircle,
  Shield,
  RefreshCw,
} from "lucide-react";
import type {
  NotificationType,
  NotificationPriority,
} from "@/types/notification";

export const NOTIFICATION_TYPE_CONFIG = {
  info: {
    icon: Info,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/20",
  },
  success: {
    icon: CheckCircle,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/20",
  },
  warning: {
    icon: AlertTriangle,
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10",
    borderColor: "border-yellow-500/20",
  },
  error: {
    icon: XCircle,
    color: "text-red-500",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/20",
  },
  system: {
    icon: AlertCircle,
    color: "text-gray-500",
    bgColor: "bg-gray-500/10",
    borderColor: "border-gray-500/20",
  },
  update: {
    icon: RefreshCw,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/20",
  },
  security: {
    icon: Shield,
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500/20",
  },
} as const satisfies Record<
  NotificationType,
  {
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    bgColor: string;
    borderColor: string;
  }
>;

export const NOTIFICATION_PRIORITY_CONFIG = {
  low: {
    label: "低",
    color: "default" as const,
    className: "",
  },
  medium: {
    label: "中",
    color: "secondary" as const,
    className: "",
  },
  high: {
    label: "高",
    color: "default" as const,
    className: "bg-orange-500 text-white hover:bg-orange-600",
  },
  urgent: {
    label: "緊急",
    color: "destructive" as const,
    className: "",
  },
} as const satisfies Record<
  NotificationPriority,
  {
    label: string;
    color: "default" | "secondary" | "destructive";
    className: string;
  }
>;

export type NotificationTypeConfig = typeof NOTIFICATION_TYPE_CONFIG;
export type NotificationPriorityConfig = typeof NOTIFICATION_PRIORITY_CONFIG;
