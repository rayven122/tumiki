import type { JSX } from "react";

export const StatusBar = (): JSX.Element => {
  return (
    <div className="border-t border-white/[0.08] bg-[#0a0a0a] px-6 py-1.5">
      <div className="flex items-center justify-between text-[10px] text-zinc-600">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            接続済み
          </span>
          <span>MCPサーバー: 4 / 5 稼働中</span>
        </div>
        <span>v0.1.0</span>
      </div>
    </div>
  );
};
