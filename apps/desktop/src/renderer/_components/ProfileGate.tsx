import type { JSX } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import type { ProfileState } from "../../shared/types";
import { PROFILE_CHANGED_EVENT } from "../../shared/events";
import { startDesktopRelogin } from "../utils/desktop-relogin";

export const ProfileGate = (): JSX.Element => {
  const [profile, setProfile] = useState<ProfileState | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const refreshProfile = useCallback((): void => {
    const refresh = async (): Promise<void> => {
      try {
        const state = await window.electronAPI.profile.getState();
        if (mountedRef.current) {
          setError(null);
          setProfile(state);
        }

        if (state.hasCompletedInitialProfileSetup && state.activeProfile) {
          const authenticated = await window.electronAPI.auth.isAuthenticated();
          if (!authenticated) {
            if (mountedRef.current) setIsAuthenticating(true);
            try {
              await startDesktopRelogin("認証セッションが見つかりません。", {
                onSuccess: () => {
                  if (!mountedRef.current) return;
                  setIsAuthenticating(false);
                  refreshProfile();
                },
                onError: (message) => {
                  if (!mountedRef.current) return;
                  setIsAuthenticating(false);
                  setError(message || "再ログインに失敗しました");
                },
                onTimeout: () => {
                  if (!mountedRef.current) return;
                  setIsAuthenticating(false);
                  setError("再ログインがタイムアウトしました");
                },
              });
            } catch {
              if (mountedRef.current) {
                setError("再ログインの開始に失敗しました");
                setIsAuthenticating(false);
              }
              return;
            }
          } else {
            if (mountedRef.current) {
              setIsAuthenticating(false);
            }
          }
        } else {
          if (mountedRef.current) {
            setIsAuthenticating(false);
          }
        }
      } catch {
        if (mountedRef.current) {
          setError("プロファイル状態の取得に失敗しました");
          setProfile(null);
        }
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    };

    void refresh();
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    refreshProfile();
    window.addEventListener(PROFILE_CHANGED_EVENT, refreshProfile);
    return () => {
      mountedRef.current = false;
      window.removeEventListener(PROFILE_CHANGED_EVENT, refreshProfile);
    };
  }, [refreshProfile]);

  if (loading || isAuthenticating) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#e8eaed] text-sm text-gray-500 dark:bg-[#0a0a0a] dark:text-zinc-500">
        {isAuthenticating ? "認証中..." : "読み込み中..."}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-[#e8eaed] text-sm dark:bg-[#0a0a0a]">
        <p className="text-red-400">{error}</p>
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            setError(null);
            refreshProfile();
          }}
          className="rounded-lg border border-gray-200 px-4 py-2 text-gray-600 transition hover:bg-black/[.02] hover:text-gray-900 dark:border-white/[.08] dark:bg-white/[.04] dark:text-zinc-400"
        >
          再試行
        </button>
      </div>
    );
  }

  if (!profile?.hasCompletedInitialProfileSetup || !profile.activeProfile) {
    return <Navigate to="/profile-setup" replace />;
  }

  return <Outlet />;
};
