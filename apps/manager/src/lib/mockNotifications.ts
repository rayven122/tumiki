import type { Notification } from "@/types/notification";

export const mockNotifications: Notification[] = [
  {
    id: "1",
    title: "システムアップデート完了",
    message: "バージョン2.5.0へのアップデートが正常に完了しました。",
    type: "success",
    priority: "medium",
    timestamp: new Date(Date.now() - 1000 * 60 * 5), // 5分前
    read: false,
    category: "システム",
    details:
      "新機能:\n- MCP サーバーの自動設定機能を追加\n- パフォーマンスを20%改善\n- UIの応答性を向上",
    source: "System Update Service",
    relatedUrl: "/changelog",
    data: {
      value: 2.5,
      previousValue: 2.4,
      trend: "up",
    },
    actions: [
      {
        label: "変更履歴を確認",
        action: () => {
          if (typeof window !== "undefined") {
            window.open("/changelog", "_blank", "noopener,noreferrer");
          }
        },
        variant: "default",
      },
      {
        label: "既読にする",
        action: () => {
          // 実際の実装では親コンポーネントのonMarkAsReadを呼び出す
          // この関数は通知詳細モーダルでオーバーライドされるため、プレースホルダー
        },
        variant: "ghost",
      },
    ],
  },
  {
    id: "2",
    title: "API使用量が上限に近づいています",
    message: "今月のAPI使用量が80%に達しました。",
    type: "warning",
    priority: "high",
    timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30分前
    read: false,
    category: "使用量",
    details:
      "現在のAPI使用状況:\n- 使用量: 8,000 / 10,000 リクエスト\n- 残り: 2,000 リクエスト\n- リセット日: 月末",
    source: "Usage Monitor",
    data: {
      value: 80,
      previousValue: 50,
      trend: "up",
      chartData: [
        { label: "1週目", value: 1500 },
        { label: "2週目", value: 2000 },
        { label: "3週目", value: 2500 },
        { label: "4週目", value: 2000 },
      ],
    },
    actions: [
      {
        label: "プランをアップグレード",
        action: () => {
          if (typeof window !== "undefined") {
            window.location.href = "/settings/billing";
          }
        },
        variant: "default",
      },
      {
        label: "使用状況を確認",
        action: () => {
          if (typeof window !== "undefined") {
            window.location.href = "/settings/usage";
          }
        },
        variant: "outline",
      },
    ],
  },
  {
    id: "3",
    title: "新しいMCPサーバーが利用可能",
    message: "OpenAI MCPサーバーがインストール可能になりました。",
    type: "info",
    priority: "low",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2時間前
    read: true,
    category: "MCPサーバー",
    details:
      "OpenAI MCPサーバーの機能:\n- GPT-4モデルへのアクセス\n- 画像生成機能\n- テキスト埋め込み生成",
    source: "MCP Server Registry",
    relatedUrl: "/mcp-servers",
    actions: [
      {
        label: "今すぐインストール",
        action: () => {
          if (typeof window !== "undefined") {
            window.location.href = "/mcp-servers/install/openai";
          }
        },
        variant: "default",
      },
      {
        label: "詳細を見る",
        action: () => {
          if (typeof window !== "undefined") {
            window.location.href = "/mcp-servers/openai";
          }
        },
        variant: "ghost",
      },
    ],
  },
  {
    id: "4",
    title: "セキュリティアラート",
    message: "異常なログイン試行が検出されました。",
    type: "error",
    priority: "urgent",
    timestamp: new Date(Date.now() - 1000 * 60 * 15), // 15分前
    read: false,
    category: "セキュリティ",
    details:
      "検出された異常:\n- 場所: 不明な地域からのアクセス\n- 時刻: 2024-01-20 14:30\n- IPアドレス: 192.168.1.1\n- 試行回数: 3回",
    source: "Security Monitor",
    data: {
      metadata: {
        ip: "192.168.1.1",
        location: "Unknown",
        attempts: 3,
      },
    },
    actions: [
      {
        label: "パスワードを変更",
        action: () => {
          if (typeof window !== "undefined") {
            window.location.href = "/profile/security";
          }
        },
        variant: "destructive",
      },
      {
        label: "アクティビティを確認",
        action: () => {
          if (typeof window !== "undefined") {
            window.location.href = "/profile/security/activity";
          }
        },
        variant: "outline",
      },
    ],
  },
  {
    id: "5",
    title: "バックアップ完了",
    message: "データベースのバックアップが正常に完了しました。",
    type: "success",
    priority: "low",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1日前
    read: true,
    category: "バックアップ",
    details:
      "バックアップ詳細:\n- サイズ: 1.2GB\n- 所要時間: 5分\n- 保存先: クラウドストレージ",
    source: "Backup Service",
    data: {
      value: 1.2,
      metadata: {
        size: "1.2GB",
        duration: "5分",
        location: "Cloud Storage",
      },
    },
  },
  {
    id: "6",
    title: "パフォーマンス改善のお知らせ",
    message: "システムの応答時間が30%改善されました。",
    type: "update",
    priority: "medium",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3), // 3時間前
    read: false,
    category: "パフォーマンス",
    details:
      "改善内容:\n- API応答時間: 200ms → 140ms\n- ページ読み込み: 1.5s → 1.0s\n- データベースクエリ: 50ms → 35ms",
    source: "Performance Monitor",
    data: {
      value: 140,
      previousValue: 200,
      trend: "down",
      chartData: [
        { label: "月曜", value: 200 },
        { label: "火曜", value: 180 },
        { label: "水曜", value: 160 },
        { label: "木曜", value: 140 },
      ],
    },
  },
];
