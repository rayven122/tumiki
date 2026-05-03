import type { JSX } from "react";
import { useState, useEffect } from "react";
import { useAtomValue } from "jotai";
import { themeAtom } from "../store/atoms";
import { KeyRound, ArrowLeft, Loader2 } from "lucide-react";

type View = "buttons" | "sso-form";

export const Login = (): JSX.Element => {
  const theme = useAtomValue(themeAtom);
  const [view, setView] = useState<View>("buttons");
  const [managerUrl, setManagerUrl] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    window.electronAPI.manager
      .getUrl()
      .then((url) => {
        if (url) setManagerUrl(url);
      })
      .catch(() => setManagerUrl(""));
  }, []);

  const handleSsoSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!managerUrl.trim()) return;

    setError(null);
    setIsConnecting(true);
    try {
      await window.electronAPI.manager.connect(managerUrl.trim());
      await window.electronAPI.auth.login();
    } catch (err) {
      setError(err instanceof Error ? err.message : "接続に失敗しました");
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div
      className={`flex h-screen flex-col items-center justify-center bg-[var(--bg-app)] ${theme === "light" ? "light" : ""}`}
    >
      <div className="flex w-full max-w-sm flex-col items-center px-6">
        {/* ロゴ */}
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--bg-active)] text-2xl font-bold text-[var(--text-primary)]">
          T
        </div>

        <h1 className="mt-4 text-2xl font-bold tracking-tight text-[var(--text-primary)]">
          TUMIKI
        </h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">AIの社員証</p>

        {view === "buttons" ? (
          <div className="mt-10 flex w-full flex-col gap-3">
            <button
              disabled
              className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-[var(--btn-primary-bg)] px-4 py-3 text-sm font-medium text-[var(--btn-primary-text)] opacity-50 transition-colors"
            >
              <KeyRound size={16} />
              Entra ID でサインイン
            </button>

            <button
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-active)] px-4 py-3 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-card-hover)]"
              onClick={() => setView("sso-form")}
            >
              SSO でサインイン
            </button>
          </div>
        ) : (
          <form
            className="mt-10 flex w-full flex-col gap-3"
            onSubmit={handleSsoSubmit}
          >
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="manager-url"
                className="text-xs font-medium text-[var(--text-secondary)]"
              >
                管理サーバー URL
              </label>
              <input
                id="manager-url"
                type="url"
                value={managerUrl}
                onChange={(e) => setManagerUrl(e.target.value)}
                placeholder="https://manager.example.com"
                required
                disabled={isConnecting}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-active)] px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-subtle)] focus:ring-2 focus:ring-[var(--btn-primary-bg)] focus:outline-none disabled:opacity-50"
              />
            </div>

            {error && (
              <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isConnecting || !managerUrl.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--btn-primary-bg)] px-4 py-3 text-sm font-medium text-[var(--btn-primary-text)] transition-colors hover:bg-[var(--btn-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isConnecting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  接続中...
                </>
              ) : (
                "接続してサインイン"
              )}
            </button>

            <button
              type="button"
              disabled={isConnecting}
              onClick={() => {
                setView("buttons");
                setError(null);
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-active)] px-4 py-3 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-card-hover)] disabled:opacity-50"
            >
              <ArrowLeft size={16} />
              戻る
            </button>
          </form>
        )}

        <p className="mt-6 text-xs text-[var(--text-subtle)]">
          組織のアカウントでログインしてください
        </p>
      </div>

      <p className="absolute bottom-6 text-[10px] text-[var(--text-subtle)]">
        Powered by RAYVEN
      </p>
    </div>
  );
};
