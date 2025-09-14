import type { Notification } from "@/types/notification";

// モック通知データ
export const mockNotifications: Notification[] = [
  {
    id: "1",
    title: "MCPサーバーエラー",
    message: "context7 サーバーへの接続に失敗しました",
    type: "error",
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 5), // 5分前
    link: "/settings/mcp-servers",
    actionLabel: "設定を確認",
  },
  {
    id: "2",
    title: "メンテナンス予定",
    message: "12月15日 午前2時〜4時にメンテナンスを実施します",
    type: "warning",
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60), // 1時間前
  },
  {
    id: "3",
    title: "新機能リリース",
    message: "Playwright MCPサーバーが利用可能になりました",
    type: "success",
    isRead: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2時間前
    link: "/docs/mcp-servers/playwright",
    actionLabel: "詳細を見る",
  },
  {
    id: "4",
    title: "APIキー期限切れ通知",
    message: "OpenAI APIキーが7日後に期限切れになります",
    type: "warning",
    isRead: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1日前
    link: "/settings/api-keys",
    actionLabel: "更新する",
  },
  {
    id: "5",
    title: "チャット履歴保存完了",
    message: "過去30日分のチャット履歴をエクスポートしました",
    type: "info",
    isRead: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48), // 2日前
  },
];
