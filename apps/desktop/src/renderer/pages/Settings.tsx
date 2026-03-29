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
    <h3 className="text-xs font-medium text-zinc-500">{title}</h3>
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.id} className="flex items-center justify-between">
          <span className="text-sm text-zinc-300">{item.label}</span>
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
    <div className="min-h-screen space-y-6 bg-[#0a0a0a] p-6">
      <h1 className="text-xl font-semibold text-white">設定</h1>

      {/* プロフィール */}
      <div className="space-y-5 rounded-xl border border-white/[0.08] bg-[#111] p-6">
        <h2 className="text-sm font-medium text-white">プロフィール</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-1">
            <p className="text-zinc-500">氏名</p>
            <p className="text-zinc-300">{CURRENT_USER.name}</p>
          </div>
          <div className="space-y-1">
            <p className="text-zinc-500">メールアドレス</p>
            <p className="text-zinc-300">{CURRENT_USER.email}</p>
          </div>
          <div className="space-y-1">
            <p className="text-zinc-500">部署</p>
            <p className="text-zinc-300">{CURRENT_USER.department}</p>
          </div>
          <div className="space-y-1">
            <p className="text-zinc-500">ロール</p>
            <p className="text-zinc-300">{CURRENT_USER.role}</p>
          </div>
          <div className="space-y-1">
            <p className="text-zinc-500">社員ID</p>
            <p className="text-zinc-300">{CURRENT_USER.employeeId}</p>
          </div>
          <div className="space-y-1">
            <p className="text-zinc-500">最終ログイン</p>
            <p className="text-zinc-300">{CURRENT_USER.lastLogin}</p>
          </div>
        </div>

        {/* 権限サマリー */}
        <div className="space-y-3 border-t border-white/[0.08] pt-4">
          <h3 className="text-xs font-medium text-zinc-500">権限サマリー</h3>
          <div className="flex gap-4 text-sm">
            <div className="rounded-lg border border-white/[0.08] px-4 py-2.5">
              <p className="text-xs text-zinc-500">承認済みツール</p>
              <p className="text-lg font-semibold text-white">
                {approvedTools.length}
              </p>
            </div>
            {Object.entries(permissionCounts).map(([perm, count]) => (
              <div
                key={perm}
                className="rounded-lg border border-white/[0.08] px-4 py-2.5"
              >
                <p className="text-xs text-zinc-500">{perm}</p>
                <p className="text-lg font-semibold text-white">{count}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 通知設定 */}
      <div className="space-y-5 rounded-xl border border-white/[0.08] bg-[#111] p-6">
        <h2 className="text-sm font-medium text-white">通知設定</h2>
        <NotificationSection
          title="メール通知"
          items={emailSettings}
          onToggle={toggleEmail}
        />
        <div className="border-t border-white/[0.08]" />
        <NotificationSection
          title="ポータル内通知"
          items={portalSettings}
          onToggle={togglePortal}
        />
      </div>

      {/* 保存ボタン */}
      <button className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black hover:bg-zinc-200">
        保存
      </button>
    </div>
  );
};
