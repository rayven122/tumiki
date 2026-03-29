import type { JSX } from "react";
import { Bell } from "lucide-react";

export const Header = (): JSX.Element => {
  return (
    <header className="border-b border-white/[0.08] bg-[#0a0a0a] px-6 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold tracking-tight text-white">
            TUMIKI
          </span>
          <span className="text-[10px] text-zinc-600">Desktop</span>
        </div>
        <div className="flex items-center gap-4">
          <button className="relative rounded-lg p-2 text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-zinc-300">
            <Bell className="h-4 w-4" />
            <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-emerald-400" />
          </button>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-800 text-xs font-medium text-zinc-300">
              田
            </div>
            <div>
              <div className="text-xs text-zinc-300">田中太郎</div>
              <div className="text-[10px] text-zinc-600">営業部</div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
