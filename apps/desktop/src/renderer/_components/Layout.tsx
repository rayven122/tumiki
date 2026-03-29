import type { JSX } from "react";
import { Outlet } from "react-router-dom";
import { useAtomValue } from "jotai";
import { themeAtom } from "../store/atoms";
import { Sidebar } from "./Sidebar";

export const Layout = (): JSX.Element => {
  const theme = useAtomValue(themeAtom);

  return (
    <div
      className={`flex h-screen ${theme === "light" ? "light" : ""}`}
      style={{ backgroundColor: "var(--bg-app)" }}
    >
      {/* サイドバー（最下層） */}
      <Sidebar />
      {/* メインコンテンツ（サイドバーの上に載る） */}
      <main
        className="flex-1 overflow-y-auto rounded-tl-xl"
        style={{
          backgroundColor: "var(--bg-main)",
          borderTop: "1px solid var(--border)",
          borderLeft: "1px solid var(--border)",
        }}
      >
        <Outlet />
      </main>
    </div>
  );
};
