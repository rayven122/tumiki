import { type JSX, useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Loader2, LogIn, ShieldCheck, Users2 } from "lucide-react";
import { EMAIL_NOTIFICATIONS, PORTAL_NOTIFICATIONS } from "../data/mock";
import type { NotificationSetting } from "../data/mock";
import { SettingsForm } from "../_components/SettingsForm";
import { ConfirmDialog } from "../_components/ConfirmDialog";
import type { ProfileState } from "../../shared/types";
import { PROFILE_CHANGED_EVENT } from "../../shared/events";
import type { DesktopSession } from "../../main/types";
import { formatElectronIpcErrorMessage } from "../utils/errorHandling";

/** トグルスイッチ */
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
    className={`relative h-5 w-9 rounded-full transition-colors ${enabled ? "bg-emerald-600 dark:bg-emerald-400" : "bg-gray-300 dark:bg-zinc-600"}`}
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
    <h3 className="text-xs font-medium text-gray-500 dark:text-zinc-500">
      {title}
    </h3>
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.id} className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-zinc-400">
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
const PERMISSION_LABELS = {
  read: "read",
  write: "write",
  execute: "execute",
} as const;

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
  const isWaitingForReloginRef = useRef(false);

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

  const setReloginWaiting = useCallback((waiting: boolean): void => {
    isWaitingForReloginRef.current = waiting;
    setIsWaitingForRelogin(waiting);
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
      if (!mountedRef.current) return;
      setReloginWaiting(true);
      reloginTimeoutRef.current = setTimeout(() => {
        if (!mountedRef.current) return;
        setReloginWaiting(false);
        setReloginError(
          "再ログインがタイムアウトしました。もう一度実行してください。",
        );
        reloginTimeoutRef.current = null;
      }, RELOGIN_TIMEOUT_MS);
      await window.electronAPI.auth.login();
    } catch (err) {
      if (mountedRef.current) {
        clearReloginTimeout();
        setReloginError(
          formatElectronIpcErrorMessage(err, "再ログインの開始に失敗しました"),
        );
        setReloginWaiting(false);
      }
    } finally {
      if (mountedRef.current) setIsReloginStarting(false);
    }
  }, [
    clearReloginTimeout,
    isReloginStarting,
    isWaitingForRelogin,
    profile?.organizationProfile?.managerUrl,
    setReloginWaiting,
  ]);

  useEffect(() => {
    mountedRef.current = true;
    refreshProfile();
    window.addEventListener(PROFILE_CHANGED_EVENT, refreshProfile);
    const cleanupSuccess = window.electronAPI.auth.onCallbackSuccess(() => {
      if (!mountedRef.current || !isWaitingForReloginRef.current) return;
      clearReloginTimeout();
      setReloginWaiting(false);
      setIsReloginStarting(false);
      setReloginError(null);
      setSessionError(null);
      refreshProfile();
    });
    const cleanupError = window.electronAPI.auth.onCallbackError((message) => {
      if (!mountedRef.current || !isWaitingForReloginRef.current) return;
      clearReloginTimeout();
      setReloginWaiting(false);
      setIsReloginStarting(false);
      setReloginError(
        formatElectronIpcErrorMessage(message, "再ログインに失敗しました"),
      );
    });
    return () => {
      mountedRef.current = false;
      window.removeEventListener(PROFILE_CHANGED_EVENT, refreshProfile);
      clearReloginTimeout();
      cleanupSuccess();
      cleanupError();
    };
  }, [clearReloginTimeout, refreshProfile, setReloginWaiting]);

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
        setDisconnectError(formatElectronIpcErrorMessage(err, "不明なエラー"));
      }
    } finally {
      if (mountedRef.current) setIsDisconnecting(false);
    }
  }, [isDisconnecting, navigate]);

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
    : 0;
  const permissionCounts = sessionPermissionCounts ?? {};
  const permissionEntries = Object.keys(PERMISSION_LABELS).map((permission) => [
    permission,
    permissionCounts[permission] ?? 0,
  ]);

  return (
    <div className="space-y-4 p-6">
      <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
        設定
      </h1>

      {/* プロファイル */}
      <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 dark:border-white/[.08] dark:bg-zinc-900">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-medium text-gray-900 dark:text-white">
              プロファイル
            </h2>
            <p className="mt-1 text-xs text-gray-500 dark:text-zinc-500">
              現在の利用形態と組織連携の状態
            </p>
          </div>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
              profile?.activeProfile === "organization"
                ? "bg-blue-600/10 text-blue-600 dark:bg-blue-400/10 dark:text-blue-400"
                : "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-400"
            }`}
          >
            {profile?.activeProfile === "organization"
              ? "組織利用"
              : "個人利用"}
          </span>
        </div>

        {profile?.activeProfile === "organization" ? (
          <>
            <div className="grid gap-4 border-t border-gray-200 pt-4 text-sm md:grid-cols-2 dark:border-white/[.08]">
              <div>
                <p className="text-xs text-gray-500 dark:text-zinc-500">
                  管理サーバー
                </p>
                <p className="mt-1 break-all text-gray-600 dark:text-zinc-400">
                  {profile.organizationProfile?.managerUrl ?? "未設定"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-zinc-500">
                  接続日時
                </p>
                <p className="mt-1 text-gray-600 dark:text-zinc-400">
                  {profile.organizationProfile?.connectedAt
                    ? new Date(
                        profile.organizationProfile.connectedAt,
                      ).toLocaleString("ja-JP")
                    : "-"}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 border-t border-gray-200 pt-4 dark:border-white/[.08]">
              <button
                type="button"
                onClick={() => void startRelogin()}
                disabled={isReloginStarting || isWaitingForRelogin}
                className="flex h-11 items-center gap-2 rounded-lg border border-gray-200 px-4 text-sm font-medium text-gray-600 transition hover:bg-black/[.02] disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/[.08] dark:bg-white/[.04] dark:text-zinc-400"
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
              <p className="text-xs leading-5 text-gray-500 dark:text-zinc-500">
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

            <div className="space-y-4 border-t border-gray-200 pt-4 dark:border-white/[.08]">
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                  組織セッション
                </h3>
                <p className="mt-1 text-xs text-gray-500 dark:text-zinc-500">
                  管理サーバーから取得したユーザー情報・権限・機能フラグ
                </p>
              </div>

              {sessionError && (
                <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">
                  {sessionError}
                </p>
              )}

              {!sessionError && !desktopSession && (
                <div className="rounded-lg border border-gray-200 bg-black/[.06] p-4 text-sm text-gray-500 dark:border-white/[.08] dark:bg-white/[.08] dark:text-zinc-500">
                  {sessionLoading
                    ? "管理サーバーから取得しています..."
                    : "組織セッションはまだ取得されていません。"}
                </div>
              )}

              {desktopSession && (
                <>
                  <div className="grid gap-3 md:grid-cols-4">
                    <div className="rounded-lg border border-gray-200 bg-black/[.06] p-3 dark:border-white/[.08] dark:bg-white/[.08]">
                      <div className="mb-2 flex items-center gap-2 text-xs text-gray-500 dark:text-zinc-500">
                        <Building2 size={14} />
                        組織
                      </div>
                      <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                        {desktopSession.organization.name ?? "未設定"}
                      </p>
                      <p className="mt-1 truncate text-[10px] text-gray-400 dark:text-zinc-600">
                        {desktopSession.organization.slug ?? "-"}
                      </p>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-black/[.06] p-3 dark:border-white/[.08] dark:bg-white/[.08]">
                      <div className="mb-2 flex items-center gap-2 text-xs text-gray-500 dark:text-zinc-500">
                        <Users2 size={14} />
                        グループ
                      </div>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {desktopSession.groups.length}
                      </p>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-black/[.06] p-3 dark:border-white/[.08] dark:bg-white/[.08]">
                      <div className="mb-2 text-xs text-gray-500 dark:text-zinc-500">
                        部署
                      </div>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {desktopSession.orgUnits.length}
                      </p>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-black/[.06] p-3 dark:border-white/[.08] dark:bg-white/[.08]">
                      <div className="mb-2 flex items-center gap-2 text-xs text-gray-500 dark:text-zinc-500">
                        <ShieldCheck size={14} />
                        権限
                      </div>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {desktopSession.permissions.length}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-lg border border-gray-200 p-4 dark:border-white/[.08]">
                      <h3 className="text-xs font-medium text-gray-500 dark:text-zinc-500">
                        ユーザー
                      </h3>
                      <div className="mt-3 grid gap-3 text-sm md:grid-cols-2">
                        <div>
                          <p className="text-xs text-gray-400 dark:text-zinc-600">
                            氏名
                          </p>
                          <p className="mt-1 text-gray-600 dark:text-zinc-400">
                            {desktopSession.user.name ?? "-"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 dark:text-zinc-600">
                            メール
                          </p>
                          <p className="mt-1 truncate text-gray-600 dark:text-zinc-400">
                            {desktopSession.user.email ?? "-"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 dark:text-zinc-600">
                            ロール
                          </p>
                          <p className="mt-1 text-gray-600 dark:text-zinc-400">
                            {desktopSession.user.role}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 dark:text-zinc-600">
                            サブジェクト
                          </p>
                          <p className="mt-1 truncate font-mono text-[11px] text-gray-600 dark:text-zinc-400">
                            {desktopSession.user.sub}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg border border-gray-200 p-4 dark:border-white/[.08]">
                      <h3 className="text-xs font-medium text-gray-500 dark:text-zinc-500">
                        組織
                      </h3>
                      <div className="mt-3 grid gap-3 text-sm md:grid-cols-2">
                        <div>
                          <p className="text-xs text-gray-400 dark:text-zinc-600">
                            組織名
                          </p>
                          <p className="mt-1 text-gray-600 dark:text-zinc-400">
                            {desktopSession.organization.name ?? "未設定"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 dark:text-zinc-600">
                            slug
                          </p>
                          <p className="mt-1 truncate font-mono text-[11px] text-gray-600 dark:text-zinc-400">
                            {desktopSession.organization.slug ?? "未設定"}
                          </p>
                        </div>
                        <div className="md:col-span-2">
                          <p className="text-xs text-gray-400 dark:text-zinc-600">
                            ポリシーバージョン
                          </p>
                          <p className="mt-1 truncate font-mono text-[11px] text-gray-600 dark:text-zinc-400">
                            {desktopSession.policyVersion}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-gray-200 p-4 dark:border-white/[.08]">
                    <h3 className="text-xs font-medium text-gray-500 dark:text-zinc-500">
                      所属グループ
                    </h3>
                    {desktopSession.groups.length > 0 ? (
                      <div className="mt-3 grid gap-2 md:grid-cols-2">
                        {desktopSession.groups.map((group) => (
                          <div
                            key={group.id}
                            className="rounded-lg bg-black/[.06] px-3 py-2 dark:bg-white/[.08]"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <p className="truncate text-sm text-gray-600 dark:text-zinc-400">
                                {group.name}
                              </p>
                              <span className="rounded-full bg-black/[.02] px-2 py-0.5 text-[10px] text-gray-400 dark:bg-white/[.04] dark:text-zinc-600">
                                {group.source}
                              </span>
                            </div>
                            <p className="mt-1 truncate text-[10px] text-gray-400 dark:text-zinc-600">
                              {group.provider ?? group.membershipSource}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-3 rounded-lg bg-black/[.06] px-3 py-2 text-sm text-gray-500 dark:bg-white/[.08] dark:text-zinc-500">
                        所属グループなし
                      </p>
                    )}
                  </div>

                  <div className="rounded-lg border border-gray-200 p-4 dark:border-white/[.08]">
                    <h3 className="text-xs font-medium text-gray-500 dark:text-zinc-500">
                      部署・組織単位
                    </h3>
                    {desktopSession.orgUnits.length > 0 ? (
                      <div className="mt-3 grid gap-2 md:grid-cols-2">
                        {desktopSession.orgUnits.map((orgUnit) => (
                          <div
                            key={orgUnit.id}
                            className="rounded-lg bg-black/[.06] px-3 py-2 dark:bg-white/[.08]"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <p className="truncate text-sm text-gray-600 dark:text-zinc-400">
                                {orgUnit.name}
                              </p>
                              <div className="flex shrink-0 items-center gap-1">
                                {orgUnit.isPrimary && (
                                  <span className="rounded-full bg-blue-600/10 px-2 py-0.5 text-[10px] text-blue-600 dark:bg-blue-400/10 dark:text-blue-400">
                                    primary
                                  </span>
                                )}
                                <span className="rounded-full bg-black/[.02] px-2 py-0.5 text-[10px] text-gray-400 dark:bg-white/[.04] dark:text-zinc-600">
                                  {orgUnit.source}
                                </span>
                              </div>
                            </div>
                            <p className="mt-1 truncate text-[10px] text-gray-400 dark:text-zinc-600">
                              {orgUnit.path ?? orgUnit.externalId ?? "-"}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-3 rounded-lg bg-black/[.06] px-3 py-2 text-sm text-gray-500 dark:bg-white/[.08] dark:text-zinc-500">
                        部署情報なし
                      </p>
                    )}
                  </div>

                  <div className="rounded-lg border border-gray-200 p-4 dark:border-white/[.08]">
                    <h3 className="text-xs font-medium text-gray-500 dark:text-zinc-500">
                      権限サマリー
                    </h3>
                    <div className="mt-3 flex flex-wrap gap-3 text-sm">
                      <div className="rounded-lg border border-gray-200 px-4 py-2.5 dark:border-white/[.08]">
                        <p className="text-xs text-gray-500 dark:text-zinc-500">
                          承認済みツール
                        </p>
                        <p className="text-lg font-semibold text-gray-900 dark:text-white">
                          {approvedToolCount}
                        </p>
                      </div>
                      {permissionEntries.map(([perm, count]) => (
                        <div
                          key={perm}
                          className="rounded-lg border border-gray-200 px-4 py-2.5 dark:border-white/[.08]"
                        >
                          <p className="text-xs text-gray-500 dark:text-zinc-500">
                            {perm}
                          </p>
                          <p className="text-lg font-semibold text-gray-900 dark:text-white">
                            {count}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-lg border border-gray-200 p-4 dark:border-white/[.08]">
                    <h3 className="text-xs font-medium text-gray-500 dark:text-zinc-500">
                      機能フラグ
                    </h3>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {Object.entries(desktopSession.features).map(
                        ([key, enabled]) => (
                          <div
                            key={key}
                            className="flex items-center justify-between rounded-lg bg-black/[.06] px-3 py-2 dark:bg-white/[.08]"
                          >
                            <span className="text-xs text-gray-600 dark:text-zinc-400">
                              {key}
                            </span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                enabled
                                  ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-400"
                                  : "bg-black/[.02] text-gray-400 dark:bg-white/[.04] dark:text-zinc-600"
                              }`}
                            >
                              {enabled ? "ON" : "OFF"}
                            </span>
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </>
        ) : (
          <div className="rounded-lg border border-gray-200 bg-black/[.06] p-4 dark:border-white/[.08] dark:bg-white/[.08]">
            <p className="text-sm leading-6 text-gray-500 dark:text-zinc-500">
              個人利用プロファイルで動作しています。組織利用へ変更する場合は、管理サーバーへ接続してください。
            </p>
            <button
              type="button"
              onClick={() =>
                navigate("/profile-setup?mode=organization", { replace: false })
              }
              className="mt-4 inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-black/[.02] hover:text-gray-900 dark:border-white/[.08] dark:bg-white/[.04] dark:text-white dark:text-zinc-400"
            >
              <Building2 size={16} />
              組織利用へ切り替え
            </button>
          </div>
        )}
      </div>

      {/* 通知設定 */}
      <div className="space-y-5 rounded-xl border border-gray-200 bg-white p-6 dark:border-white/[.08] dark:bg-zinc-900">
        <h2 className="text-sm font-medium text-gray-900 dark:text-white">
          通知設定
        </h2>
        <NotificationSection
          title="メール通知"
          items={emailSettings}
          onToggle={toggleEmail}
        />
        <div className="border-t border-gray-200 dark:border-white/[.08]" />
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
        className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90 dark:bg-white dark:text-black"
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
