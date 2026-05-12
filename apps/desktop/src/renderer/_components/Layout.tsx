import type { JSX } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";

export const Layout = (): JSX.Element => {
  return (
    <div className="flex h-screen bg-[#e8eaed] dark:bg-[#0a0a0a]">
      {/* サイドバー（最下層） */}
      <Sidebar />
      {/* メインコンテンツ（サイドバーの上に載る、上右下に3px余白） */}
      <div className="flex min-w-0 flex-1 flex-col py-2 pr-2">
        <main className="flex-1 overflow-x-hidden overflow-y-auto rounded-xl border border-gray-200 bg-[#f4f5f7] dark:border-white/[.08] dark:bg-[#111111]">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
