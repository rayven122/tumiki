import type { JSX } from "react";
import { Outlet } from "react-router-dom";
import { useAtomValue } from "jotai";
import { themeAtom } from "../store/atoms";
import { Sidebar } from "./Sidebar";

export const Layout = (): JSX.Element => {
  const theme = useAtomValue(themeAtom);

  return (
    <div
      className={`flex h-screen bg-[var(--bg-app)] ${theme === "light" ? "light" : ""}`}
    >
      {/* サイドバー（最下層） */}
      <Sidebar />
      {/* メインコンテンツ（サイドバーの上に載る、上右下に3px余白） */}
      <div className="flex min-w-0 flex-1 flex-col py-2 pr-2">
        <main className="flex-1 overflow-x-hidden overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--bg-main)] shadow-[var(--shadow-main)]">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
