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
      <div className="flex h-screen items-center justify-center bg-[var(--bg-app)] text-sm text-[var(--text-muted)]">
        読み込み中...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-[var(--bg-app)] text-sm">
        <p className="text-red-400">{error}</p>
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            setError(null);
            refreshProfile();
          }}
          className="rounded-lg border border-[var(--border)] px-4 py-2 text-[var(--text-secondary)] transition hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-primary)]"
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
