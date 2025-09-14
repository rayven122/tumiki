export type NotificationType =
  | "info"
  | "success"
  | "warning"
  | "error"
  | "system"
  | "update"
  | "security";

export type NotificationPriority = "low" | "medium" | "high" | "urgent";

export type NotificationAction = {
  label: string;
  action: () => void | Promise<void>;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost";
};

export type NotificationData = {
  value?: number;
  previousValue?: number;
  trend?: "up" | "down" | "stable";
  chartData?: Array<{
    label: string;
    value: number;
  }>;
  metadata?: Record<string, unknown>;
};

export type Notification = {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  priority: NotificationPriority;
  timestamp: Date;
  read: boolean;
  category?: string;
  data?: NotificationData;
  actions?: NotificationAction[];
  details?: string;
  source?: string;
  relatedUrl?: string;
};
