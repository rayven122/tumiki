import React from "react";
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
    <div className="rounded-lg border border-gray-200 bg-white p-6">
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
  );
};
