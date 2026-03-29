import type { JSX } from "react";
import { Outlet } from "react-router-dom";
import { useAtomValue } from "jotai";
import { themeAtom } from "../store/atoms";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { StatusBar } from "./StatusBar";

export const Layout = (): JSX.Element => {
  const theme = useAtomValue(themeAtom);

  return (
    <div
      className={`flex h-screen flex-col ${theme === "light" ? "light" : ""}`}
      style={{ backgroundColor: "var(--bg-app)" }}
    >
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
      <StatusBar />
    </div>
  );
};
