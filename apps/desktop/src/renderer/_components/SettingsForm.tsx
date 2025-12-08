import React, { useState, useEffect } from "react";
import { useAtom } from "jotai";
import { appConfigAtom } from "../store/atoms";
import { LogIn, LogOut, CheckCircle, XCircle } from "lucide-react";

export const SettingsForm = (): React.ReactElement => {
  const [config, setConfig] = useAtom(appConfigAtom);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);

  // 認証状態を確認
  useEffect(() => {
    const checkAuthStatus = async (): Promise<void> => {
      try {
        const authenticated = await window.electronAPI.auth.isAuthenticated();
        setIsAuthenticated(authenticated);
      } catch (error) {
        console.error("Failed to check auth status:", error);
      }
    };

    checkAuthStatus();

    // 認証コールバックイベントリスナー
    const cleanupSuccess = window.electronAPI.auth.onCallbackSuccess(() => {
      setIsAuthenticated(true);
      setIsLoading(false);
      setAuthSuccess("ログインに成功しました");
      setAuthError(null);
      // 3秒後に成功メッセージを消す
      setTimeout(() => setAuthSuccess(null), 3000);
    });

    const cleanupError = window.electronAPI.auth.onCallbackError((error) => {
      setIsLoading(false);
      setAuthError(`ログインに失敗しました: ${error}`);
      setAuthSuccess(null);
    });

    return () => {
      cleanupSuccess();
      cleanupError();
    };
  }, []);

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
    } catch (error) {
      setIsLoading(false);
      setAuthError(
        error instanceof Error ? error.message : "ログインに失敗しました",
      );
    }
  };

  // ログアウトハンドラー
  const handleLogout = async (): Promise<void> => {
    setIsLoading(true);
    setAuthError(null);
    setAuthSuccess(null);
    try {
      await window.electronAPI.auth.logout();
      setIsAuthenticated(false);
      setIsLoading(false);
      setAuthSuccess("ログアウトしました");
      // 3秒後に成功メッセージを消す
      setTimeout(() => setAuthSuccess(null), 3000);
    } catch (error) {
      setIsLoading(false);
      setAuthError(
        error instanceof Error ? error.message : "ログアウトに失敗しました",
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* 認証セクション */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">
          Keycloak 認証
        </h3>

        {/* 認証状態表示 */}
        <div className="mb-4 flex items-center space-x-2">
          {isAuthenticated ? (
            <>
              <CheckCircle className="text-green-600" size={20} />
              <span className="text-sm font-medium text-green-600">
                認証済み
              </span>
            </>
          ) : (
            <>
              <XCircle className="text-red-600" size={20} />
              <span className="text-sm font-medium text-red-600">未認証</span>
            </>
          )}
        </div>

        {/* 成功メッセージ */}
        {authSuccess && (
          <div className="mb-4 rounded-md bg-green-50 p-4">
            <p className="text-sm text-green-800">{authSuccess}</p>
          </div>
        )}

        {/* エラーメッセージ */}
        {authError && (
          <div className="mb-4 rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-800">{authError}</p>
          </div>
        )}

        {/* ログイン/ログアウトボタン */}
        <div className="flex space-x-4">
          {isAuthenticated ? (
            <button
              onClick={handleLogout}
              disabled={isLoading}
              className="flex items-center space-x-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <LogOut size={16} />
              <span>{isLoading ? "ログアウト中..." : "ログアウト"}</span>
            </button>
          ) : (
            <button
              onClick={handleLogin}
              disabled={isLoading}
              className="flex items-center space-x-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <LogIn size={16} />
              <span>{isLoading ? "ログイン中..." : "ログイン"}</span>
            </button>
          )}
        </div>

        <p className="mt-4 text-xs text-gray-500">
          ログインボタンをクリックすると、ブラウザでKeycloakのログインページが開きます。
          認証後、自動的にアプリに戻ります。
        </p>
      </div>

      {/* アプリ設定セクション */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">
          アプリケーション設定
        </h3>
        <div className="space-y-6">
          <div>
            <label
              htmlFor="theme"
              className="block text-sm font-medium text-gray-700"
            >
              テーマ
            </label>
            <select
              id="theme"
              value={config.theme}
              onChange={handleThemeChange}
              className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            >
              <option value="light">ライト</option>
              <option value="dark">ダーク</option>
            </select>
            <p className="mt-2 text-xs text-gray-500">
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
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </div>
            <div className="ml-3">
              <label htmlFor="autoStart" className="font-medium text-gray-700">
                システム起動時に自動起動
              </label>
              <p className="text-xs text-gray-500">
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
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </div>
            <div className="ml-3">
              <label
                htmlFor="minimizeToTray"
                className="font-medium text-gray-700"
              >
                システムトレイに最小化
              </label>
              <p className="text-xs text-gray-500">
                ウィンドウを閉じたときにシステムトレイに最小化します
              </p>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
              設定を保存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
