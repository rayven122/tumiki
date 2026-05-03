import type React from "react";
import { useAtom } from "jotai";
import { appConfigAtom } from "../store/atoms";

export const SettingsForm = (): React.ReactElement => {
  const [config, setConfig] = useAtom(appConfigAtom);

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

  return (
    <div className="space-y-6">
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
