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
      {/* メインコンテンツ（サイドバーの上に載る、上右下に3px余白） */}
      <div
        className="flex flex-1 flex-col"
        style={{ padding: "8px 8px 8px 0" }}
      >
        <main
          className="flex-1 overflow-y-auto rounded-xl"
          style={{
            backgroundColor: "var(--bg-main)",
            border: "1px solid var(--border)",
            boxShadow: "var(--shadow-main)",
          }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
};
