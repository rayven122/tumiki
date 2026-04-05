import type { JSX } from "react";
import { useAtomValue } from "jotai";
import { themeAtom } from "../store/atoms";
import { KeyRound } from "lucide-react";

/* ---------- メインコンポーネント ---------- */

export const Login = (): JSX.Element => {
  const theme = useAtomValue(themeAtom);

  return (
    <div
      className={`flex h-screen flex-col items-center justify-center bg-[var(--bg-app)] ${theme === "light" ? "light" : ""}`}
    >
      {/* メインカード */}
      <div className="flex w-full max-w-sm flex-col items-center px-6">
        {/* ロゴ */}
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--bg-active)] text-2xl font-bold text-[var(--text-primary)]">
          T
        </div>

        {/* タイトル */}
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-[var(--text-primary)]">
          TUMIKI
        </h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">AIの社員証</p>

        {/* ログインボタン群 */}
        <div className="mt-10 flex w-full flex-col gap-3">
          {/* プライマリ: Entra ID */}
          <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--btn-primary-bg)] px-4 py-3 text-sm font-medium text-[var(--btn-primary-text)] transition-colors hover:bg-[var(--btn-primary-hover)]">
            <KeyRound size={16} />
            Entra ID でサインイン
          </button>

          {/* セカンダリ: SSO */}
          <button className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-active)] px-4 py-3 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-card-hover)]">
            SSO でサインイン
          </button>
        </div>

        {/* 補助テキスト */}
        <p className="mt-6 text-xs text-[var(--text-subtle)]">
          組織のアカウントでログインしてください
        </p>
      </div>

      {/* Powered by */}
      <p className="absolute bottom-6 text-[10px] text-[var(--text-subtle)]">
        Powered by RAYVEN
      </p>
    </div>
  );
};
