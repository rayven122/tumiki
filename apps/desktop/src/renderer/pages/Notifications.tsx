import type { JSX } from "react";
import { useState } from "react";
import {
  CheckCircle,
  FileText,
  Wrench,
  AlertTriangle,
  XCircle,
} from "lucide-react";

/* ---------- 通知タイプ ---------- */

type NotificationType =
  | "approval"
  | "request"
  | "tool"
  | "maintenance"
  | "error";

type Notification = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  date: string;
  read: boolean;
};

/* ---------- モックデータ ---------- */

const INITIAL_NOTIFICATIONS: Notification[] = [
  {
    id: "n1",
    type: "approval",
    title: "権限申請が承認されました",
    body: "freee の新規利用申請が佐藤一郎（情報システム部）により承認されました。",
    date: "03/25 14:00",
    read: true,
  },
  {
    id: "n2",
    type: "request",
    title: "権限申請の確認依頼",
    body: "Salesforce の Write 権限申請が山田花子（営業部 部長）に送信されました。",
    date: "03/29 10:15",
    read: false,
  },
  {
    id: "n3",
    type: "tool",
    title: "新しいツールが追加されました",
    body: "「経費精算ツール（freee）」が組織のツールカタログに追加されました。",
    date: "03/28 09:00",
    read: true,
  },
  {
    id: "n4",
    type: "maintenance",
    title: "メンテナンス予定",
    body: "4/5 (土) 02:00-04:00 にシステムメンテナンスを実施します。",
    date: "03/27 11:00",
    read: true,
  },
  {
    id: "n5",
    type: "error",
    title: "操作がブロックされました",
    body: "Salesforce の get_contact 操作がブロックされました（権限不足）。",
    date: "03/29 10:02",
    read: false,
  },
];

/* ---------- タイプ別アイコン ---------- */

const TYPE_ICONS: Record<NotificationType, JSX.Element> = {
  approval: <CheckCircle size={18} />,
  request: <FileText size={18} />,
  tool: <Wrench size={18} />,
  maintenance: <AlertTriangle size={18} />,
  error: <XCircle size={18} />,
};

const TYPE_COLORS: Record<NotificationType, string> = {
  approval: "var(--badge-success-text)",
  request: "var(--badge-warn-text)",
  tool: "var(--text-muted)",
  maintenance: "var(--badge-warn-text)",
  error: "var(--badge-error-text)",
};

/* ---------- メインコンポーネント ---------- */

export const Notifications = (): JSX.Element => {
  const [notifications, setNotifications] = useState<Notification[]>(
    INITIAL_NOTIFICATIONS,
  );

  const unreadCount = notifications.filter((n) => !n.read).length;

  // カードクリックでread状態をトグル
  const toggleRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: !n.read } : n)),
    );
  };

  // すべて既読にする
  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <div className="space-y-4 p-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2
            className="text-lg font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            通知
          </h2>
          {unreadCount > 0 && (
            <span
              className="rounded-full px-2 py-0.5 text-xs font-medium"
              style={{
                backgroundColor: "var(--badge-error-bg)",
                color: "var(--badge-error-text)",
              }}
            >
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="rounded-lg px-3 py-1.5 text-xs transition-colors"
            style={{
              backgroundColor: "var(--bg-active)",
              color: "var(--text-secondary)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--bg-card-hover)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "var(--bg-active)";
            }}
          >
            すべて既読にする
          </button>
        )}
      </div>

      {/* 通知カード一覧 */}
      <div className="space-y-2">
        {notifications.map((n) => (
          <button
            key={n.id}
            onClick={() => toggleRead(n.id)}
            className="flex w-full items-start gap-3 rounded-xl p-4 text-left transition-colors"
            style={{
              backgroundColor: n.read ? "var(--bg-card)" : "var(--bg-active)",
              border: "1px solid var(--border)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--bg-card-hover)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = n.read
                ? "var(--bg-card)"
                : "var(--bg-active)";
            }}
          >
            {/* 未読インジケータ */}
            <div className="flex shrink-0 items-center pt-1">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{
                  backgroundColor: n.read ? "transparent" : "#3b82f6",
                }}
              />
            </div>

            {/* タイプアイコン */}
            <div
              className="shrink-0 pt-0.5"
              style={{ color: TYPE_COLORS[n.type] }}
            >
              {TYPE_ICONS[n.type]}
            </div>

            {/* コンテンツ */}
            <div className="min-w-0 flex-1">
              <div
                className="text-sm font-medium"
                style={{ color: "var(--text-primary)" }}
              >
                {n.title}
              </div>
              <div
                className="mt-0.5 text-xs leading-relaxed"
                style={{ color: "var(--text-muted)" }}
              >
                {n.body}
              </div>
            </div>

            {/* 日付 */}
            <span
              className="shrink-0 text-[10px]"
              style={{ color: "var(--text-subtle)" }}
            >
              {n.date}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
