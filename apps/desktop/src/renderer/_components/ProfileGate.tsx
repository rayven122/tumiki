import type { JSX } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import type { ProfileState } from "../../shared/types";
import { PROFILE_CHANGED_EVENT } from "../../shared/events";

export const ProfileGate = (): JSX.Element => {
  const [profile, setProfile] = useState<ProfileState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const refreshProfile = useCallback((): void => {
    window.electronAPI.profile
      .getState()
      .then((state) => {
        if (mountedRef.current) {
          setError(null);
          setProfile(state);
        }
      })
      .catch(() => {
        if (mountedRef.current) {
          setError("プロファイル状態の取得に失敗しました");
          setProfile(null);
        }
      })
      .finally(() => {
        if (mountedRef.current) setLoading(false);
      });
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

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#e8eaed] text-sm text-gray-500 dark:bg-[#0a0a0a] dark:text-zinc-500">
        読み込み中...
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
