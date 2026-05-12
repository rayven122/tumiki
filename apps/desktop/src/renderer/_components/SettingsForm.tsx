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
      <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-white/[.08] dark:bg-zinc-900">
        <h3 className="mb-4 text-sm font-medium text-gray-900 dark:text-white">
          アプリケーション設定
        </h3>
        <div className="space-y-6">
          <div>
            <label
              htmlFor="theme"
              className="block text-sm font-medium text-gray-600 dark:text-zinc-400"
            >
              テーマ
            </label>
            <select
              id="theme"
              value={config.theme}
              onChange={handleThemeChange}
              className="mt-1 block w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 focus:outline-none dark:border-white/[.08] dark:bg-zinc-900 dark:text-white dark:focus:border-white dark:focus:ring-white"
            >
              <option value="light">ライト</option>
              <option value="dark">ダーク</option>
            </select>
            <p className="mt-2 text-xs text-gray-500 dark:text-zinc-500">
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
                className="h-4 w-4 rounded border-gray-200 text-gray-900 focus:ring-gray-900 dark:border-white/[.08] dark:text-white dark:focus:ring-white"
              />
            </div>
            <div className="ml-3">
              <label
                htmlFor="autoStart"
                className="text-sm font-medium text-gray-600 dark:text-zinc-400"
              >
                システム起動時に自動起動
              </label>
              <p className="text-xs text-gray-500 dark:text-zinc-500">
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
                className="h-4 w-4 rounded border-gray-200 text-gray-900 focus:ring-gray-900 dark:border-white/[.08] dark:text-white dark:focus:ring-white"
              />
            </div>
            <div className="ml-3">
              <label
                htmlFor="minimizeToTray"
                className="text-sm font-medium text-gray-600 dark:text-zinc-400"
              >
                システムトレイに最小化
              </label>
              <p className="text-xs text-gray-500 dark:text-zinc-500">
                ウィンドウを閉じたときにシステムトレイに最小化します
              </p>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4 dark:border-white/[.08]">
            <p className="text-xs text-gray-500 dark:text-zinc-500">
              設定は自動的に保存されます
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
