import type { JSX } from "react";
import { useState } from "react";
import {
  CURRENT_USER,
  TOOLS,
  EMAIL_NOTIFICATIONS,
  PORTAL_NOTIFICATIONS,
} from "../data/mock";
import type { NotificationSetting } from "../data/mock";

/** トグルスイッチ */
const Toggle = ({
  enabled,
  onToggle,
}: {
  enabled: boolean;
  onToggle: () => void;
}): JSX.Element => (
  <button
    onClick={onToggle}
    className={`relative h-5 w-9 rounded-full transition-colors ${enabled ? "bg-emerald-500" : "bg-zinc-700"}`}
  >
    <div
      className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${enabled ? "left-[18px]" : "left-0.5"}`}
    />
  </button>
);

/** 通知設定セクション */
const NotificationSection = ({
  title,
  items,
  onToggle,
}: {
  title: string;
  items: NotificationSetting[];
  onToggle: (id: string) => void;
}): JSX.Element => (
  <div className="space-y-3">
    <h3 className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
      {title}
    </h3>
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.id} className="flex items-center justify-between">
          <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
            {item.label}
          </span>
          <Toggle enabled={item.enabled} onToggle={() => onToggle(item.id)} />
        </div>
      ))}
    </div>
  </div>
);

// 設定ページ
export const SettingsPage = (): JSX.Element => {
  const [emailSettings, setEmailSettings] =
    useState<NotificationSetting[]>(EMAIL_NOTIFICATIONS);
  const [portalSettings, setPortalSettings] =
    useState<NotificationSetting[]>(PORTAL_NOTIFICATIONS);

  /** 通知トグル */
  const toggleEmail = (id: string) => {
    setEmailSettings((prev) =>
      prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)),
    );
  };

  const togglePortal = (id: string) => {
    setPortalSettings((prev) =>
      prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)),
    );
  };

  // 権限サマリー
  const approvedTools = TOOLS.filter((t) => t.approved);
  const permissionCounts = approvedTools.reduce(
    (acc, tool) => {
      for (const perm of tool.permissions) {
        acc[perm] = (acc[perm] ?? 0) + 1;
      }
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <div
      className="min-h-screen space-y-6 p-6"
      style={{ backgroundColor: "var(--bg-app)" }}
    >
      <h1
        className="text-xl font-semibold"
        style={{ color: "var(--text-primary)" }}
      >
        設定
      </h1>

      {/* プロフィール */}
      <div
        className="space-y-5 rounded-xl p-6"
        style={{
          borderWidth: 1,
          borderStyle: "solid",
          borderColor: "var(--border)",
          backgroundColor: "var(--bg-card)",
        }}
      >
        <h2
          className="text-sm font-medium"
          style={{ color: "var(--text-primary)" }}
        >
          プロフィール
        </h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-1">
            <p style={{ color: "var(--text-muted)" }}>氏名</p>
            <p style={{ color: "var(--text-secondary)" }}>
              {CURRENT_USER.name}
            </p>
          </div>
          <div className="space-y-1">
            <p style={{ color: "var(--text-muted)" }}>メールアドレス</p>
            <p style={{ color: "var(--text-secondary)" }}>
              {CURRENT_USER.email}
            </p>
          </div>
          <div className="space-y-1">
            <p style={{ color: "var(--text-muted)" }}>部署</p>
            <p style={{ color: "var(--text-secondary)" }}>
              {CURRENT_USER.department}
            </p>
          </div>
          <div className="space-y-1">
            <p style={{ color: "var(--text-muted)" }}>ロール</p>
            <p style={{ color: "var(--text-secondary)" }}>
              {CURRENT_USER.role}
            </p>
          </div>
          <div className="space-y-1">
            <p style={{ color: "var(--text-muted)" }}>社員ID</p>
            <p style={{ color: "var(--text-secondary)" }}>
              {CURRENT_USER.employeeId}
            </p>
          </div>
          <div className="space-y-1">
            <p style={{ color: "var(--text-muted)" }}>最終ログイン</p>
            <p style={{ color: "var(--text-secondary)" }}>
              {CURRENT_USER.lastLogin}
            </p>
          </div>
        </div>

        {/* 権限サマリー */}
        <div
          className="space-y-3 pt-4"
          style={{
            borderTopWidth: 1,
            borderTopStyle: "solid",
            borderTopColor: "var(--border)",
          }}
        >
          <h3
            className="text-xs font-medium"
            style={{ color: "var(--text-muted)" }}
          >
            権限サマリー
          </h3>
          <div className="flex gap-4 text-sm">
            <div
              className="rounded-lg px-4 py-2.5"
              style={{
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: "var(--border)",
              }}
            >
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                承認済みツール
              </p>
              <p
                className="text-lg font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                {approvedTools.length}
              </p>
            </div>
            {Object.entries(permissionCounts).map(([perm, count]) => (
              <div
                key={perm}
                className="rounded-lg px-4 py-2.5"
                style={{
                  borderWidth: 1,
                  borderStyle: "solid",
                  borderColor: "var(--border)",
                }}
              >
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {perm}
                </p>
                <p
                  className="text-lg font-semibold"
                  style={{ color: "var(--text-primary)" }}
                >
                  {count}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 通知設定 */}
      <div
        className="space-y-5 rounded-xl p-6"
        style={{
          borderWidth: 1,
          borderStyle: "solid",
          borderColor: "var(--border)",
          backgroundColor: "var(--bg-card)",
        }}
      >
        <h2
          className="text-sm font-medium"
          style={{ color: "var(--text-primary)" }}
        >
          通知設定
        </h2>
        <NotificationSection
          title="メール通知"
          items={emailSettings}
          onToggle={toggleEmail}
        />
        <div
          style={{
            borderTopWidth: 1,
            borderTopStyle: "solid",
            borderTopColor: "var(--border)",
          }}
        />
        <NotificationSection
          title="ポータル内通知"
          items={portalSettings}
          onToggle={togglePortal}
        />
      </div>

      {/* 保存ボタン */}
      <button
        className="rounded-lg px-4 py-2 text-sm font-medium hover:opacity-90"
        style={{
          backgroundColor: "var(--btn-primary-bg)",
          color: "var(--btn-primary-text)",
        }}
      >
        保存
      </button>
    </div>
  );
};
