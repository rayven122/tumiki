import { type JSX, useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Loader2, LogIn, ShieldCheck, Users2 } from "lucide-react";
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
import { PROFILE_CHANGED_EVENT } from "../../shared/events";
import type { DesktopSession } from "../../main/types";
import { formatElectronIpcErrorMessage } from "../utils/errorHandling";

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

const RELOGIN_TIMEOUT_MS = 120_000;

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
  const [desktopSession, setDesktopSession] = useState<DesktopSession | null>(
    null,
  );
  const [sessionLoading, setSessionLoading] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [isReloginStarting, setIsReloginStarting] = useState(false);
  const [isWaitingForRelogin, setIsWaitingForRelogin] = useState(false);
  const [reloginError, setReloginError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const reloginTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshDesktopSession = useCallback((): void => {
    setSessionLoading(true);
    setSessionError(null);
    window.electronAPI.desktopSession
      .get()
      .then((session) => {
        if (mountedRef.current) setDesktopSession(session);
      })
      .catch((err) => {
        if (mountedRef.current) {
          setDesktopSession(null);
          setSessionError(
            formatElectronIpcErrorMessage(
              err,
              "Desktopセッションの取得に失敗しました",
            ),
          );
        }
      })
      .finally(() => {
        if (mountedRef.current) setSessionLoading(false);
      });
  }, []);

  const refreshProfile = useCallback((): void => {
    window.electronAPI.profile
      .getState()
      .then((state) => {
        if (mountedRef.current) {
          setProfile(state);
          if (state.activeProfile === "organization") {
            refreshDesktopSession();
          } else {
            setDesktopSession(null);
            setSessionError(null);
          }
        }
      })
      .catch(() => {
        if (mountedRef.current) setProfile(null);
      });
  }, [refreshDesktopSession]);

  const clearReloginTimeout = useCallback((): void => {
    if (reloginTimeoutRef.current) {
      clearTimeout(reloginTimeoutRef.current);
      reloginTimeoutRef.current = null;
    }
  }, []);

  const startRelogin = useCallback(async (): Promise<void> => {
    if (isReloginStarting || isWaitingForRelogin) return;

    const managerUrl = profile?.organizationProfile?.managerUrl;
    if (!managerUrl) {
      setReloginError("管理サーバーURLが設定されていません");
      return;
    }

    setIsReloginStarting(true);
    setReloginError(null);
    setSessionError(null);
    clearReloginTimeout();
    try {
      // 保存済みURLでOIDC設定を再読み込みしてからOAuthフローを開始する。
      await window.electronAPI.manager.connect(managerUrl);
      await window.electronAPI.auth.login();
      if (mountedRef.current) {
        setIsWaitingForRelogin(true);
        reloginTimeoutRef.current = setTimeout(() => {
          if (!mountedRef.current) return;
          setIsWaitingForRelogin(false);
          setReloginError(
            "再ログインがタイムアウトしました。もう一度実行してください。",
          );
          reloginTimeoutRef.current = null;
        }, RELOGIN_TIMEOUT_MS);
      }
    } catch (err) {
      if (mountedRef.current) {
        clearReloginTimeout();
        setReloginError(
          err instanceof Error ? err.message : "再ログインの開始に失敗しました",
        );
        setIsWaitingForRelogin(false);
      }
    } finally {
      if (mountedRef.current) setIsReloginStarting(false);
    }
  }, [
    clearReloginTimeout,
    isReloginStarting,
    isWaitingForRelogin,
    profile?.organizationProfile?.managerUrl,
  ]);

  useEffect(() => {
    mountedRef.current = true;
    refreshProfile();
    window.addEventListener(PROFILE_CHANGED_EVENT, refreshProfile);
    const cleanupSuccess = window.electronAPI.auth.onCallbackSuccess(() => {
      if (!mountedRef.current) return;
      clearReloginTimeout();
      setIsWaitingForRelogin(false);
      setIsReloginStarting(false);
      setReloginError(null);
      setSessionError(null);
      refreshProfile();
    });
    const cleanupError = window.electronAPI.auth.onCallbackError((message) => {
      if (!mountedRef.current) return;
      clearReloginTimeout();
      setIsWaitingForRelogin(false);
      setIsReloginStarting(false);
      setReloginError(
        `再ログインに失敗しました: ${formatElectronIpcErrorMessage(
          message,
          message,
        )}`,
      );
    });
    return () => {
      mountedRef.current = false;
      window.removeEventListener(PROFILE_CHANGED_EVENT, refreshProfile);
      clearReloginTimeout();
      cleanupSuccess();
      cleanupError();
    };
  }, [clearReloginTimeout, refreshProfile]);

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

  const disconnectOrganization = useCallback(async (): Promise<void> => {
    if (isDisconnecting) return;
    setIsDisconnecting(true);
    setDisconnectError(null);
    try {
      await window.electronAPI.profile.disconnectOrganization();
      if (mountedRef.current) {
        setShowDisconnectConfirm(false);
        window.dispatchEvent(new Event(PROFILE_CHANGED_EVENT));
        navigate("/profile-setup", { replace: true });
      }
    } catch (err) {
      if (mountedRef.current) {
        setDisconnectError(err instanceof Error ? err.message : "不明なエラー");
      }
    } finally {
      if (mountedRef.current) setIsDisconnecting(false);
    }
  }, [isDisconnecting, navigate]);

  // 権限サマリー
  const mockApprovedTools = TOOLS.filter((t) => t.approved);
  const mockPermissionCounts = mockApprovedTools.reduce(
    (acc, tool) => {
      for (const perm of tool.permissions) {
        acc[perm] = (acc[perm] ?? 0) + 1;
      }
      return acc;
    },
    {} as Record<string, number>,
  );
  const sessionPermissionCounts = desktopSession?.permissions.reduce(
    (acc, permission) => {
      if (permission.read) acc.read = (acc.read ?? 0) + 1;
      if (permission.write) acc.write = (acc.write ?? 0) + 1;
      if (permission.execute) acc.execute = (acc.execute ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );
  const approvedToolCount = desktopSession
    ? new Set(
        desktopSession.permissions.map((permission) => permission.mcpServerId),
      ).size
    : mockApprovedTools.length;
  const permissionCounts = sessionPermissionCounts ?? mockPermissionCounts;

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
          <>
            <div className="grid gap-4 border-t border-[var(--border)] pt-4 text-sm md:grid-cols-2">
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

            <div className="flex flex-wrap items-center gap-3 border-t border-[var(--border)] pt-4">
              <button
                type="button"
                onClick={() => void startRelogin()}
                disabled={isReloginStarting || isWaitingForRelogin}
                className="flex h-11 items-center gap-2 rounded-lg border border-[var(--border)] px-4 text-sm font-medium text-[var(--text-secondary)] transition hover:bg-[var(--bg-card-hover)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isReloginStarting || isWaitingForRelogin ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <LogIn size={15} />
                )}
                {isReloginStarting
                  ? "接続中..."
                  : isWaitingForRelogin
                    ? "ログイン待機中..."
                    : "再ログイン"}
              </button>
              <button
                type="button"
                onClick={() => setShowDisconnectConfirm(true)}
                className="h-11 rounded-lg border border-red-500/30 px-4 text-sm font-medium text-red-400 transition hover:bg-red-500/10"
              >
                組織利用を停止
              </button>
              <p className="text-xs leading-5 text-[var(--text-muted)]">
                組織利用が有効な間は、個人利用には切り替えられません。
              </p>
            </div>

            {disconnectError && (
              <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">
                組織利用の停止に失敗しました: {disconnectError}
              </p>
            )}
            {reloginError && (
              <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">
                {reloginError}
              </p>
            )}

            <div className="space-y-4 border-t border-[var(--border)] pt-4">
              <div>
                <h3 className="text-sm font-medium text-[var(--text-primary)]">
                  組織セッション
                </h3>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  管理サーバーから取得したユーザー情報・権限・機能フラグ
                </p>
              </div>

              {sessionError && (
                <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">
                  {sessionError}
                </p>
              )}

              {!sessionError && !desktopSession && (
                <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-active)] p-4 text-sm text-[var(--text-muted)]">
                  {sessionLoading
                    ? "管理サーバーから取得しています..."
                    : "組織セッションはまだ取得されていません。"}
                </div>
              )}

              {desktopSession && (
                <>
                  <div className="grid gap-3 md:grid-cols-4">
                    <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-active)] p-3">
                      <div className="mb-2 flex items-center gap-2 text-xs text-[var(--text-muted)]">
                        <Building2 size={14} />
                        組織
                      </div>
                      <p className="truncate text-sm font-medium text-[var(--text-primary)]">
                        {desktopSession.organization.name ?? "未設定"}
                      </p>
                      <p className="mt-1 truncate text-[10px] text-[var(--text-subtle)]">
                        {desktopSession.organization.slug ?? "-"}
                      </p>
                    </div>
                    <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-active)] p-3">
                      <div className="mb-2 flex items-center gap-2 text-xs text-[var(--text-muted)]">
                        <Users2 size={14} />
                        グループ
                      </div>
                      <p className="text-lg font-semibold text-[var(--text-primary)]">
                        {desktopSession.groups.length}
                      </p>
                    </div>
                    <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-active)] p-3">
                      <div className="mb-2 flex items-center gap-2 text-xs text-[var(--text-muted)]">
                        <ShieldCheck size={14} />
                        権限
                      </div>
                      <p className="text-lg font-semibold text-[var(--text-primary)]">
                        {desktopSession.permissions.length}
                      </p>
                    </div>
                    <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-active)] p-3">
                      <div className="mb-2 text-xs text-[var(--text-muted)]">
                        ポリシーバージョン
                      </div>
                      <p className="truncate font-mono text-[11px] text-[var(--text-secondary)]">
                        {desktopSession.policyVersion}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-lg border border-[var(--border)] p-4">
                      <h3 className="text-xs font-medium text-[var(--text-muted)]">
                        ユーザー
                      </h3>
                      <div className="mt-3 grid gap-3 text-sm md:grid-cols-2">
                        <div>
                          <p className="text-xs text-[var(--text-subtle)]">
                            氏名
                          </p>
                          <p className="mt-1 text-[var(--text-secondary)]">
                            {desktopSession.user.name ?? "-"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-[var(--text-subtle)]">
                            メール
                          </p>
                          <p className="mt-1 truncate text-[var(--text-secondary)]">
                            {desktopSession.user.email ?? "-"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-[var(--text-subtle)]">
                            ロール
                          </p>
                          <p className="mt-1 text-[var(--text-secondary)]">
                            {desktopSession.user.role}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-[var(--text-subtle)]">
                            サブジェクト
                          </p>
                          <p className="mt-1 truncate font-mono text-[11px] text-[var(--text-secondary)]">
                            {desktopSession.user.sub}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg border border-[var(--border)] p-4">
                      <h3 className="text-xs font-medium text-[var(--text-muted)]">
                        機能フラグ
                      </h3>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        {Object.entries(desktopSession.features).map(
                          ([key, enabled]) => (
                            <div
                              key={key}
                              className="flex items-center justify-between rounded-lg bg-[var(--bg-active)] px-3 py-2"
                            >
                              <span className="text-xs text-[var(--text-secondary)]">
                                {key}
                              </span>
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                  enabled
                                    ? "bg-[var(--badge-success-bg)] text-[var(--badge-success-text)]"
                                    : "bg-[var(--bg-card-hover)] text-[var(--text-subtle)]"
                                }`}
                              >
                                {enabled ? "ON" : "OFF"}
                              </span>
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  </div>

                  {desktopSession.groups.length > 0 && (
                    <div className="rounded-lg border border-[var(--border)] p-4">
                      <h3 className="text-xs font-medium text-[var(--text-muted)]">
                        所属グループ
                      </h3>
                      <div className="mt-3 grid gap-2 md:grid-cols-2">
                        {desktopSession.groups.map((group) => (
                          <div
                            key={group.id}
                            className="rounded-lg bg-[var(--bg-active)] px-3 py-2"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <p className="truncate text-sm text-[var(--text-secondary)]">
                                {group.name}
                              </p>
                              <span className="rounded-full bg-[var(--bg-card-hover)] px-2 py-0.5 text-[10px] text-[var(--text-subtle)]">
                                {group.source}
                              </span>
                            </div>
                            <p className="mt-1 truncate text-[10px] text-[var(--text-subtle)]">
                              {group.provider ?? group.membershipSource}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </>
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
                {approvedToolCount}
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
