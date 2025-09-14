// 通知タイプの定義
export type NotificationType = "error" | "warning" | "info" | "success";

// 通知インターフェース
export type Notification = {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  createdAt: Date;
  // オプショナルフィールド
  link?: string;
  actionLabel?: string;
  actionCallback?: () => void;
};

// 通知のグループ化インターフェース（今後の拡張用）
export type NotificationGroup = {
  date: string;
  notifications: Notification[];
};
