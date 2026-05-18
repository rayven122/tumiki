import { type JSX, useEffect, useState } from "react";
import { HashRouter, Navigate, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { useAtom } from "jotai";
import { themeAtom } from "./store/atoms";
import { DeeplinkHandler } from "./_components/DeeplinkHandler";
import { Layout } from "./_components/Layout";
import { ProfileGate } from "./_components/ProfileGate";
import { Dashboard } from "./pages/Dashboard";
import { MyTools } from "./pages/MyTools";
import { ToolDetail } from "./pages/ToolDetail";
import { ToolCatalog } from "./pages/ToolCatalog";
import { HistoryList } from "./pages/HistoryList";
import { HistoryDetail } from "./pages/HistoryDetail";
import { SettingsPage } from "./pages/Settings";
import { Notifications } from "./pages/Notifications";
import { ConnectorAuto } from "./pages/ConnectorAuto";
import { ConnectorManual } from "./pages/ConnectorManual";
import { AiIntegrations } from "./pages/AiIntegrations";
import { ProfileSetup } from "./pages/ProfileSetup";
import { toast } from "./_components/Toast";
import { TRACKING_TOOL_LABELS } from "./utils/ai-coding-telemetry-tools";
import type { AiCodingTool } from "../main/types";

/** OTLP ポート不一致時の自動再書き込み通知をトースト表示 */
const useAutoReapplyToast = (): void => {
  useEffect(() => {
    const showToast = (payload: {
      tools: AiCodingTool[];
      port: number;
    }): void => {
      const names = payload.tools
        .map((t) => TRACKING_TOOL_LABELS[t] ?? t)
        .join("・");
      toast.success(
        `${names} の使用量記録ポートが ${String(payload.port)} に変わったため設定ファイルを自動更新しました`,
      );
    };
    // 起動直後の通知取りこぼし対策: マウント時点で保留中の通知を取得する
    void window.electronAPI.aiCodingTelemetry
      .getPendingAutoReapplied()
      .then((pending) => {
        if (pending && pending.tools.length > 0) showToast(pending);
      })
      .catch(() => {
        // 取得失敗時は無視（トーストは補助通知のため）
      });
  }, []);
};

export const App = (): JSX.Element => {
  useAutoReapplyToast();
  const [theme, setTheme] = useAtom(themeAtom);
  // electron-store からの復元が終わるまでは store への保存をスキップする
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void window.electronAPI.appConfig
      .getTheme()
      .then((saved) => {
        if (!cancelled && saved !== null) setTheme(saved);
      })
      .catch(() => {
        // 取得失敗時は atom 既定値で続行する
      })
      .finally(() => {
        if (!cancelled) setHydrated(true);
      });
    return () => {
      cancelled = true;
    };
  }, [setTheme]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  useEffect(() => {
    if (!hydrated) return;
    void window.electronAPI.appConfig.setTheme(theme).catch(() => {
      // 永続化失敗はユーザー操作を妨げないため握りつぶす
    });
  }, [theme, hydrated]);
  return (
    <>
      <Toaster position="top-center" duration={3000} />
      <HashRouter>
        <DeeplinkHandler />
        <Routes>
          <Route
            path="/login"
            element={<Navigate to="/profile-setup" replace />}
          />
          <Route path="/profile-setup" element={<ProfileSetup />} />
          <Route element={<ProfileGate />}>
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="tools" element={<MyTools />} />
              <Route path="tools/catalog" element={<ToolCatalog />} />
              <Route path="tools/connector/auto" element={<ConnectorAuto />} />
              <Route
                path="tools/connector/manual"
                element={<ConnectorManual />}
              />
              <Route path="tools/:toolId" element={<ToolDetail />} />
              <Route path="history" element={<HistoryList />} />
              <Route path="history/:historyId" element={<HistoryDetail />} />
              <Route path="ai-integrations" element={<AiIntegrations />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="notifications" element={<Notifications />} />
              <Route path="admin/*" element={<Navigate to="/" replace />} />
            </Route>
          </Route>
        </Routes>
      </HashRouter>
    </>
  );
};
