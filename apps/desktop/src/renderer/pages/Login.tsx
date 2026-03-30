import type { JSX } from "react";
import { useAtomValue } from "jotai";
import { themeAtom } from "../store/atoms";
import { KeyRound } from "lucide-react";

/* ---------- メインコンポーネント ---------- */

export const Login = (): JSX.Element => {
  const theme = useAtomValue(themeAtom);

  return (
    <div
      className={`flex h-screen flex-col items-center justify-center ${theme === "light" ? "light" : ""}`}
      style={{ backgroundColor: "var(--bg-app)" }}
    >
      {/* メインカード */}
      <div className="flex w-full max-w-sm flex-col items-center px-6">
        {/* ロゴ */}
        <div
          className="flex h-16 w-16 items-center justify-center rounded-2xl text-2xl font-bold"
          style={{
            backgroundColor: "var(--bg-active)",
            color: "var(--text-primary)",
          }}
        >
          T
        </div>

        {/* タイトル */}
        <h1
          className="mt-4 text-2xl font-bold tracking-tight"
          style={{ color: "var(--text-primary)" }}
        >
          TUMIKI
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
          AIの社員証
        </p>

        {/* ログインボタン群 */}
        <div className="mt-10 flex w-full flex-col gap-3">
          {/* プライマリ: Entra ID */}
          <button
            className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition-colors"
            style={{
              backgroundColor: "var(--btn-primary-bg)",
              color: "var(--btn-primary-text)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor =
                "var(--btn-primary-hover)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "var(--btn-primary-bg)";
            }}
          >
            <KeyRound size={16} />
            Entra ID でサインイン
          </button>

          {/* セカンダリ: SSO */}
          <button
            className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition-colors"
            style={{
              backgroundColor: "var(--bg-active)",
              color: "var(--text-secondary)",
              border: "1px solid var(--border)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--bg-card-hover)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "var(--bg-active)";
            }}
          >
            SSO でサインイン
          </button>
        </div>

        {/* 補助テキスト */}
        <p className="mt-6 text-xs" style={{ color: "var(--text-subtle)" }}>
          組織のアカウントでログインしてください
        </p>
      </div>

      {/* Powered by */}
      <p
        className="absolute bottom-6 text-[10px]"
        style={{ color: "var(--text-subtle)" }}
      >
        Powered by RAYVEN
      </p>
    </div>
  );
};
