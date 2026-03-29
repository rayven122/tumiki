import type { JSX } from "react";

export const StatusBar = (): JSX.Element => {
  return (
    <div
      className="px-6 py-1.5"
      style={{
        backgroundColor: "var(--bg-app)",
        borderTop: "1px solid var(--border)",
      }}
    >
      <div
        className="flex items-center justify-between text-[10px]"
        style={{ color: "var(--text-subtle)" }}
      >
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            接続済み
          </span>
          <span>コネクタ: 4 / 5 稼働中</span>
        </div>
        <span>v0.1.0</span>
      </div>
    </div>
  );
};
