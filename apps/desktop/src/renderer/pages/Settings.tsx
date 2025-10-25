import React from "react";
import { SettingsForm } from "../_components/SettingsForm";

export const Settings = (): React.ReactElement => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">設定</h2>
        <p className="mt-1 text-sm text-gray-600">
          アプリケーションの動作をカスタマイズ
        </p>
      </div>

      <SettingsForm />
    </div>
  );
};
