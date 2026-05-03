import { type JSX, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CURRENT_USER,
  TOOLS,
  EMAIL_NOTIFICATIONS,
  PORTAL_NOTIFICATIONS,
} from "../data/mock";
import type { NotificationSetting } from "../data/mock";
import { SettingsForm } from "../_components/SettingsForm";
import { ConfirmDialog } from "../_components/ConfirmDialog";
import type { ProfileState } from "../../shared/types";

/** トグルスイッチ（CSS変数ベース） */
const Toggle = ({
  enabled,
  label,
  onToggle,
}: {
  enabled: boolean;
  label: string;
  onToggle: () => void;
}): JSX.Element => (
  <button
    type="button"
    role="switch"
    aria-checked={enabled}
    aria-label={label}
    onClick={onToggle}
    className={`relative h-5 w-9 rounded-full transition-colors ${enabled ? "bg-[var(--badge-success-text)]" : "bg-[var(--text-subtle)]"}`}
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
    <h3 className="text-xs font-medium text-[var(--text-muted)]">{title}</h3>
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.id} className="flex items-center justify-between">
          <span className="text-sm text-[var(--text-secondary)]">
            {item.label}
          </span>
          <Toggle
            enabled={item.enabled}
            label={item.label}
            onToggle={() => onToggle(item.id)}
          />
        </div>
      ))}
    </div>
  </div>
);

// 設定ページ
export const SettingsPage = (): JSX.Element => {
  const navigate = useNavigate();
  const [emailSettings, setEmailSettings] =
    useState<NotificationSetting[]>(EMAIL_NOTIFICATIONS);
  const [portalSettings, setPortalSettings] =
    useState<NotificationSetting[]>(PORTAL_NOTIFICATIONS);
  const [profile, setProfile] = useState<ProfileState | null>(null);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [disconnectError, setDisconnectError] = useState<string | null>(null);

  useEffect(() => {
    window.electronAPI.profile
      .getState()
      .then(setProfile)
      .catch(() => setProfile(null));
  }, []);

  /** 通知トグル */
  const toggleEmail = (id: string): void => {
    setEmailSettings((prev) =>
      prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)),
    );
  };

  const togglePortal = (id: string): void => {
    setPortalSettings((prev) =>
      prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)),
    );
  };

  const disconnectOrganization = async (): Promise<void> => {
    if (isDisconnecting) return;
    setIsDisconnecting(true);
    setDisconnectError(null);
    try {
      await window.electronAPI.profile.disconnectOrganization();
      setShowDisconnectConfirm(false);
      navigate("/profile-setup", { replace: true });
    } catch (err) {
      setDisconnectError(
        err instanceof Error ? err.message : "組織利用の停止に失敗しました",
      );
    } finally {
      setIsDisconnecting(false);
    }
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
    <div className="space-y-4 p-6">
      <h1 className="text-lg font-semibold text-[var(--text-primary)]">設定</h1>

      {/* プロファイル */}
      <div className="space-y-4 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-card)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-medium text-[var(--text-primary)]">
              プロファイル
            </h2>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              現在の利用形態と組織連携の状態
            </p>
          </div>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
              profile?.activeProfile === "organization"
                ? "bg-[var(--badge-info-bg)] text-[var(--badge-info-text)]"
                : "bg-[var(--badge-success-bg)] text-[var(--badge-success-text)]"
            }`}
          >
            {profile?.activeProfile === "organization"
              ? "組織利用"
              : "個人利用"}
          </span>
        </div>

        {profile?.activeProfile === "organization" ? (
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-active)] p-4">
            <div className="grid gap-3 text-sm md:grid-cols-2">
              <div>
                <p className="text-xs text-[var(--text-muted)]">管理サーバー</p>
                <p className="mt-1 break-all text-[var(--text-secondary)]">
                  {profile.organizationProfile?.managerUrl ?? "未設定"}
                </p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)]">接続日時</p>
                <p className="mt-1 text-[var(--text-secondary)]">
                  {profile.organizationProfile?.connectedAt
                    ? new Date(
                        profile.organizationProfile.connectedAt,
                      ).toLocaleString("ja-JP")
                    : "-"}
                </p>
              </div>
            </div>
            <p className="mt-3 text-xs leading-5 text-[var(--text-muted)]">
              組織利用が有効な間は、個人利用には切り替えられません。
            </p>
            {disconnectError && (
              <p className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">
                {disconnectError}
              </p>
            )}
            <button
              type="button"
              onClick={() => setShowDisconnectConfirm(true)}
              className="mt-4 rounded-lg border border-red-500/30 px-4 py-2 text-sm font-medium text-red-400 transition hover:bg-red-500/10"
            >
              組織利用を停止
            </button>
          </div>
        ) : (
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-active)] p-4 text-sm text-[var(--text-muted)]">
            個人利用プロファイルで動作しています。組織利用へ変更する場合は、初回設定から管理サーバーへ接続してください。
          </div>
        )}
      </div>

      {/* プロフィール */}
      <div className="space-y-5 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-card)]">
        <h2 className="text-sm font-medium text-[var(--text-primary)]">
          プロフィール
        </h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-1">
            <p className="text-xs text-[var(--text-muted)]">氏名</p>
            <p className="text-[var(--text-secondary)]">{CURRENT_USER.name}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-[var(--text-muted)]">メールアドレス</p>
            <p className="text-[var(--text-secondary)]">{CURRENT_USER.email}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-[var(--text-muted)]">部署</p>
            <p className="text-[var(--text-secondary)]">
              {CURRENT_USER.department}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-[var(--text-muted)]">ロール</p>
            <p className="text-[var(--text-secondary)]">{CURRENT_USER.role}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-[var(--text-muted)]">社員ID</p>
            <p className="text-[var(--text-secondary)]">
              {CURRENT_USER.employeeId}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-[var(--text-muted)]">最終ログイン</p>
            <p className="text-[var(--text-secondary)]">
              {CURRENT_USER.lastLogin}
            </p>
          </div>
        </div>

        {/* 権限サマリー */}
        <div className="space-y-3 border-t border-[var(--border)] pt-4">
          <h3 className="text-xs font-medium text-[var(--text-muted)]">
            権限サマリー
          </h3>
          <div className="flex gap-4 text-sm">
            <div className="rounded-lg border border-[var(--border)] px-4 py-2.5">
              <p className="text-xs text-[var(--text-muted)]">承認済みツール</p>
              <p className="text-lg font-semibold text-[var(--text-primary)]">
                {approvedTools.length}
              </p>
            </div>
            {Object.entries(permissionCounts).map(([perm, count]) => (
              <div
                key={perm}
                className="rounded-lg border border-[var(--border)] px-4 py-2.5"
              >
                <p className="text-xs text-[var(--text-muted)]">{perm}</p>
                <p className="text-lg font-semibold text-[var(--text-primary)]">
                  {count}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 通知設定 */}
      <div className="space-y-5 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-card)]">
        <h2 className="text-sm font-medium text-[var(--text-primary)]">
          通知設定
        </h2>
        <NotificationSection
          title="メール通知"
          items={emailSettings}
          onToggle={toggleEmail}
        />
        <div className="border-t border-[var(--border)]" />
        <NotificationSection
          title="ポータル内通知"
          items={portalSettings}
          onToggle={togglePortal}
        />
      </div>

      <SettingsForm />

      {/* 保存ボタン */}
      <button
        type="button"
        className="rounded-lg bg-[var(--btn-primary-bg)] px-4 py-2 text-sm font-medium text-[var(--btn-primary-text)] transition-colors hover:opacity-90"
      >
        保存
      </button>

      <ConfirmDialog
        open={showDisconnectConfirm}
        title="組織利用を停止"
        message="管理サーバー連携と認証トークンを削除します。停止後は初回設定から個人利用を再設定できます。"
        confirmLabel="停止"
        confirmDisabled={isDisconnecting}
        onConfirm={() => void disconnectOrganization()}
        onCancel={() => {
          if (!isDisconnecting) setShowDisconnectConfirm(false);
        }}
      />
    </div>
  );
};
