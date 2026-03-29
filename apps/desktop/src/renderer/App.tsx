import type { JSX } from "react";
import { HashRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./_components/Layout";
import { Dashboard } from "./pages/Dashboard";
import { MyTools } from "./pages/MyTools";
import { ToolDetail } from "./pages/ToolDetail";
import { ToolCatalog } from "./pages/ToolCatalog";
import { HistoryList } from "./pages/HistoryList";
import { HistoryDetail } from "./pages/HistoryDetail";
import { RequestList } from "./pages/RequestList";
import { RequestForm } from "./pages/RequestForm";
import { RequestDetail } from "./pages/RequestDetail";
import { SettingsPage } from "./pages/Settings";
import { Notifications } from "./pages/Notifications";
import { Login } from "./pages/Login";
import { AdminDashboard } from "./pages/admin/AdminDashboard";
import { AdminHistory } from "./pages/admin/AdminHistory";
import { AdminUsers } from "./pages/admin/AdminUsers";
import { AdminRoles } from "./pages/admin/AdminRoles";
import { AdminTools } from "./pages/admin/AdminTools";
import { AdminApprovals } from "./pages/admin/AdminApprovals";

export const App = (): JSX.Element => {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="tools" element={<MyTools />} />
          <Route path="tools/catalog" element={<ToolCatalog />} />
          <Route path="tools/:toolId" element={<ToolDetail />} />
          <Route path="history" element={<HistoryList />} />
          <Route path="history/:historyId" element={<HistoryDetail />} />
          <Route path="requests" element={<RequestList />} />
          <Route path="requests/new" element={<RequestForm />} />
          <Route path="requests/:requestId" element={<RequestDetail />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="admin" element={<AdminDashboard />} />
          <Route path="admin/history" element={<AdminHistory />} />
          <Route path="admin/users" element={<AdminUsers />} />
          <Route path="admin/roles" element={<AdminRoles />} />
          <Route path="admin/tools" element={<AdminTools />} />
          <Route path="admin/approvals" element={<AdminApprovals />} />
        </Route>
        {/* ログイン画面（サイドバーなし） */}
        <Route path="login" element={<Login />} />
      </Routes>
    </HashRouter>
  );
};
