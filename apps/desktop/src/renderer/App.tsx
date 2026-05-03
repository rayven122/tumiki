import type { JSX } from "react";
import { HashRouter, Navigate, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { Layout } from "./_components/Layout";
import { ProfileGate } from "./_components/ProfileGate";
import { Dashboard } from "./pages/Dashboard";
import { MyTools } from "./pages/MyTools";
import { ToolDetail } from "./pages/ToolDetail";
import { ToolCatalog } from "./pages/ToolCatalog";
import { HistoryList } from "./pages/HistoryList";
import { HistoryDetail } from "./pages/HistoryDetail";
import { UpgradePlan } from "./pages/UpgradePlan";
import { SettingsPage } from "./pages/Settings";
import { Notifications } from "./pages/Notifications";
import { ConnectorAuto } from "./pages/ConnectorAuto";
import { ConnectorManual } from "./pages/ConnectorManual";
import { AiIntegrations } from "./pages/AiIntegrations";
import { ProfileSetup } from "./pages/ProfileSetup";

export const App = (): JSX.Element => {
  return (
    <>
      <Toaster position="top-center" duration={3000} />
      <HashRouter>
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
              <Route path="requests" element={<UpgradePlan />} />
              <Route path="requests/new" element={<UpgradePlan />} />
              <Route path="requests/:requestId" element={<UpgradePlan />} />
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
