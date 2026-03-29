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
        </Route>
      </Routes>
    </HashRouter>
  );
};
