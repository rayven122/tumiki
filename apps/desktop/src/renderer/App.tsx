import React from "react";
import { HashRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./_components/Layout";
import { Dashboard } from "./pages/Dashboard";
import { McpServers } from "./pages/McpServers";
import { Settings } from "./pages/Settings";

export const App = (): React.ReactElement => {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="servers" element={<McpServers />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </HashRouter>
  );
};
