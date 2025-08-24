export type NotificationType = "error" | "warning" | "info";

export type Notification = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date;
  value?: number;
  details?: string;
  link?: {
    href: string;
    label: string;
  };
};

export const mockNotifications: Notification[] = [
  {
    id: "1",
    type: "error",
    title: "接続エラー",
    message: "GitHub Copilot MCPサーバーへの接続が失敗しました",
    timestamp: new Date(Date.now() - 1000 * 60 * 5),
    value: 3,
    details:
      "エラーコード: CONNECTION_TIMEOUT\n再試行回数: 3回\n最終試行時刻: 2024-01-15 14:23:45",
  },
  {
    id: "2",
    type: "warning",
    title: "異常なアクセス検知",
    message: "Database MCPサーバーへの異常なアクセスパターンを検知しました",
    timestamp: new Date(Date.now() - 1000 * 60 * 15),
    value: 127,
    details:
      "検知内容: 短時間での大量リクエスト\nIPアドレス: 192.168.1.105\nリクエスト数: 127回/分\n通常の平均: 10-15回/分\n対応: 自動的にレート制限を適用済み",
    link: {
      href: "/mcp/servers/database-mcp?tab=logs",
      label: "ログを確認",
    },
  },
  {
    id: "3",
    type: "warning",
    title: "メモリ使用率警告",
    message: "Slack MCPサーバーのメモリ使用率が高くなっています",
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
    value: 85,
    details: "現在のメモリ使用率: 85%\n推奨上限: 80%\n継続時間: 30分",
  },
  {
    id: "4",
    type: "warning",
    title: "異常なAPI利用検知",
    message: "GitHub MCPサーバーで短時間に大量のAPIリクエストを検知しました",
    timestamp: new Date(Date.now() - 1000 * 60 * 45),
    value: 892,
    details:
      "検知内容: 異常なAPI呼び出しパターン\nユーザー: user_12345\nリクエスト数: 892回/5分\n通常の平均: 50-100回/5分\n使用されたツール: repo_search, code_search, issue_create\n対応: APIレート制限に到達、一時的に制限中",
    link: {
      href: "/mcp/servers/github-mcp?tab=logs",
      label: "ログを確認",
    },
  },
  {
    id: "5",
    type: "info",
    title: "更新完了",
    message: "Weather MCPサーバーが正常に更新されました",
    timestamp: new Date(Date.now() - 1000 * 60 * 60),
    value: 1,
    details:
      "バージョン: 2.3.0 → 2.4.0\n更新内容: パフォーマンス改善とバグ修正",
  },
];
