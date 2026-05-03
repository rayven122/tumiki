import type { JSX } from "react";
import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import type { ProfileState } from "../../shared/types";

export const ProfileGate = (): JSX.Element => {
  const [profile, setProfile] = useState<ProfileState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const refreshProfile = (): void => {
      window.electronAPI.profile
        .getState()
        .then((state) => {
          if (mounted) {
            setError(null);
            setProfile(state);
          }
        })
        .catch(() => {
          if (mounted) {
            setError("プロファイル状態の取得に失敗しました");
            setProfile(null);
          }
        })
        .finally(() => {
          if (mounted) setLoading(false);
        });
    };
    refreshProfile();
    window.addEventListener("profile:changed", refreshProfile);
    return () => {
      mounted = false;
      window.removeEventListener("profile:changed", refreshProfile);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--bg-app)] text-sm text-[var(--text-muted)]">
        読み込み中...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--bg-app)] text-sm text-red-400">
        {error}
      </div>
    );
  }

  if (!profile?.hasCompletedInitialProfileSetup || !profile.activeProfile) {
    return <Navigate to="/profile-setup" replace />;
  }

  return <Outlet />;
};
