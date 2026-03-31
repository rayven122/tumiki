import type React from "react";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useAtom } from "jotai";
import { appConfigAtom } from "../store/atoms";
import { LogIn, LogOut, CheckCircle, XCircle } from "lucide-react";
import { AUTH_SESSION_TIMEOUT_MS } from "../../shared/types";

/**
 * タイムアウトIDを管理し、アンマウント時に全てクリアするフック
 */
const useTimeouts = () => {
  const refs = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const set = useCallback((key: string, callback: () => void, ms: number) => {
    const existing = refs.current.get(key);
    if (existing) clearTimeout(existing);
    refs.current.set(key, setTimeout(callback, ms));
  }, []);

  const clear = useCallback((key: string) => {
    const existing = refs.current.get(key);
    if (existing) {
      clearTimeout(existing);
      refs.current.delete(key);
    }
  }, []);

  const clearAll = useCallback(() => {
    for (const id of refs.current.values()) clearTimeout(id);
    refs.current.clear();
  }, []);

  // オブジェクト参照を安定化し、依存配列に含めても再レンダリングを誘発しない
  return useMemo(() => ({ set, clear, clearAll }), [set, clear, clearAll]);
};

export const SettingsForm = (): React.ReactElement => {
  const [config, setConfig] = useAtom(appConfigAtom);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const timeouts = useTimeouts();

  // エラーメッセージを設定し、10秒後に自動クリアする
  const showAuthError = useCallback(
    (message: string): void => {
      setAuthError(message);
      setAuthSuccess(null);
      timeouts.set("error", () => setAuthError(null), 10000);
    },
    [timeouts],
  );

  // 認証状態を確認
  useEffect(() => {
    const checkAuthStatus = async (): Promise<void> => {
      try {
        const authenticated = await window.electronAPI.auth.isAuthenticated();
        setIsAuthenticated(authenticated);
      } catch {
        showAuthError("認証状態の確認に失敗しました");
      }
    };

    checkAuthStatus();

    // 認証コールバックイベントリスナー
    const cleanupSuccess = window.electronAPI.auth.onCallbackSuccess(() => {
      timeouts.clear("login");
      setIsAuthenticated(true);
      setIsLoading(false);
      setAuthSuccess("ログインに成功しました");
      setAuthError(null);
      // 3秒後に成功メッセージを消す
      timeouts.set("loginSuccess", () => setAuthSuccess(null), 3000);
    });

    const cleanupError = window.electronAPI.auth.onCallbackError((error) => {
      setIsLoading(false);
      showAuthError(`ログインに失敗しました: ${error}`);
    });

    // セッション失効（バックグラウンドリフレッシュ失敗時）
    const cleanupSessionExpired = window.electronAPI.auth.onSessionExpired(
      (message) => {
        setIsAuthenticated(false);
        showAuthError(message);
      },
    );

    return () => {
      cleanupSuccess();
      cleanupError();
      cleanupSessionExpired();
      timeouts.clearAll();
    };
  }, [showAuthError, timeouts]);

  const handleThemeChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    setConfig({ ...config, theme: e.target.value as "light" | "dark" });
  };

  const handleAutoStartChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ): void => {
    setConfig({ ...config, autoStart: e.target.checked });
  };

  const handleMinimizeToTrayChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ): void => {
    setConfig({ ...config, minimizeToTray: e.target.checked });
  };

  // ログインハンドラー
  const handleLogin = async (): Promise<void> => {
    setIsLoading(true);
    setAuthError(null);
    setAuthSuccess(null);
    try {
      await window.electronAPI.auth.login();
      // ブラウザが開かれたことを通知
      setAuthSuccess("ブラウザでKeycloakログインページを開きました");
      // 5分後にコールバックが来ない場合はタイムアウト
      timeouts.set(
        "login",
        () => {
          void window.electronAPI.auth.cancelLogin();
          showAuthError("認証がタイムアウトしました。再度お試しください。");
          setIsLoading(false);
        },
        AUTH_SESSION_TIMEOUT_MS,
      );
    } catch (error) {
      setIsLoading(false);
      showAuthError(
        error instanceof Error ? error.message : "ログインに失敗しました",
      );
    }
  };

  // ログインキャンセルハンドラー
  const handleCancelLogin = (): void => {
    timeouts.clear("login");
    // mainプロセスの認証セッションもクリア
    void window.electronAPI.auth.cancelLogin();
    setIsLoading(false);
    setAuthSuccess(null);
    setAuthError(null);
  };

  // ログアウトハンドラー
  const handleLogout = async (): Promise<void> => {
    setIsLoading(true);
    setAuthError(null);
    setAuthSuccess(null);
    try {
      await window.electronAPI.auth.logout();
      setIsAuthenticated(false);
      setAuthSuccess("ログアウトしました");
      // 3秒後に成功メッセージを消す
      timeouts.set("logoutSuccess", () => setAuthSuccess(null), 3000);
    } catch (error) {
      showAuthError(
        error instanceof Error ? error.message : "ログアウトに失敗しました",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 認証セクション */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-card)]">
        <h3 className="mb-4 text-sm font-medium text-[var(--text-primary)]">
          Manager連携
        </h3>

        {/* 認証状態表示 */}
        <div className="mb-4 flex items-center space-x-2">
          {isAuthenticated === null ? (
            <span className="text-sm text-[var(--text-muted)]">
              認証状態を確認中...
            </span>
          ) : isAuthenticated ? (
            <>
              <CheckCircle
                className="text-[var(--badge-success-text)]"
                size={20}
              />
              <span className="text-sm font-medium text-[var(--badge-success-text)]">
                認証済み
              </span>
            </>
          ) : (
            <>
              <XCircle className="text-red-500" size={20} />
              <span className="text-sm font-medium text-red-500">未認証</span>
            </>
          )}
        </div>

        {/* 成功メッセージ */}
        {authSuccess && (
          <div className="mb-4 rounded-md bg-green-500/10 p-4">
            <p className="text-sm text-[var(--badge-success-text)]">
              {authSuccess}
            </p>
          </div>
        )}

        {/* エラーメッセージ */}
        {authError && (
          <div className="mb-4 rounded-md bg-red-500/10 p-4">
            <p className="text-sm text-red-500">{authError}</p>
          </div>
        )}

        {/* ログイン/ログアウトボタン */}
        <div className="flex space-x-4">
          {isAuthenticated ? (
            <button
              onClick={handleLogout}
              disabled={isLoading}
              className="flex items-center space-x-2 rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <LogOut size={16} />
              <span>{isLoading ? "ログアウト中..." : "ログアウト"}</span>
            </button>
          ) : isLoading ? (
            <>
              <button
                disabled
                className="flex cursor-not-allowed items-center space-x-2 rounded-lg bg-[var(--btn-primary-bg)] px-4 py-2 text-sm font-medium text-[var(--btn-primary-text)] opacity-50"
              >
                <LogIn size={16} />
                <span>ログイン中...</span>
              </button>
              <button
                onClick={handleCancelLogin}
                className="flex items-center rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:opacity-90"
              >
                キャンセル
              </button>
            </>
          ) : (
            <button
              onClick={handleLogin}
              disabled={isAuthenticated === null}
              className="flex items-center space-x-2 rounded-lg bg-[var(--btn-primary-bg)] px-4 py-2 text-sm font-medium text-[var(--btn-primary-text)] transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <LogIn size={16} />
              <span>ログイン</span>
            </button>
          )}
        </div>

        <p className="mt-4 text-xs text-[var(--text-muted)]">
          ログインボタンをクリックすると、ブラウザでKeycloakのログインページが開きます。
          認証後、自動的にアプリに戻ります。
        </p>
      </div>

      {/* アプリ設定セクション */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-card)]">
        <h3 className="mb-4 text-sm font-medium text-[var(--text-primary)]">
          アプリケーション設定
        </h3>
        <div className="space-y-6">
          <div>
            <label
              htmlFor="theme"
              className="block text-sm font-medium text-[var(--text-secondary)]"
            >
              テーマ
            </label>
            <select
              id="theme"
              value={config.theme}
              onChange={handleThemeChange}
              className="mt-1 block w-full rounded-md border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)] shadow-sm focus:border-[var(--btn-primary-bg)] focus:ring-1 focus:ring-[var(--btn-primary-bg)] focus:outline-none"
            >
              <option value="light">ライト</option>
              <option value="dark">ダーク</option>
            </select>
            <p className="mt-2 text-xs text-[var(--text-muted)]">
              アプリケーションの表示テーマを選択
            </p>
          </div>

          <div className="flex items-start">
            <div className="flex h-5 items-center">
              <input
                id="autoStart"
                type="checkbox"
                checked={config.autoStart}
                onChange={handleAutoStartChange}
                className="h-4 w-4 rounded border-[var(--border)] text-[var(--btn-primary-bg)] focus:ring-[var(--btn-primary-bg)]"
              />
            </div>
            <div className="ml-3">
              <label
                htmlFor="autoStart"
                className="text-sm font-medium text-[var(--text-secondary)]"
              >
                システム起動時に自動起動
              </label>
              <p className="text-xs text-[var(--text-muted)]">
                コンピューター起動時にtumikiを自動的に起動します
              </p>
            </div>
          </div>

          <div className="flex items-start">
            <div className="flex h-5 items-center">
              <input
                id="minimizeToTray"
                type="checkbox"
                checked={config.minimizeToTray}
                onChange={handleMinimizeToTrayChange}
                className="h-4 w-4 rounded border-[var(--border)] text-[var(--btn-primary-bg)] focus:ring-[var(--btn-primary-bg)]"
              />
            </div>
            <div className="ml-3">
              <label
                htmlFor="minimizeToTray"
                className="text-sm font-medium text-[var(--text-secondary)]"
              >
                システムトレイに最小化
              </label>
              <p className="text-xs text-[var(--text-muted)]">
                ウィンドウを閉じたときにシステムトレイに最小化します
              </p>
            </div>
          </div>

          <div className="border-t border-[var(--border)] pt-4">
            <p className="text-xs text-[var(--text-muted)]">
              設定は自動的に保存されます
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
