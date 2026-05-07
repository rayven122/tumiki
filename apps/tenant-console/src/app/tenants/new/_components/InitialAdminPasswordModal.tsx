"use client";

import { useEffect, useRef, useState } from "react";
import { useFocusTrap } from "@/app/_components/useFocusTrap";

type Props = {
  email: string;
  password: string;
  onClose: () => void;
};

const InitialAdminPasswordModal = ({ email, password, onClose }: Props) => {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { containerRef, handleFocusTrapKeyDown } =
    useFocusTrap<HTMLDivElement>();

  useEffect(() => {
    return () => {
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
    };
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(password);
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
      setCopyError(null);
      setCopied(true);
      copiedTimerRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopyError(
        "クリップボードへのコピーに失敗しました。手動でコピーしてください。",
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="initial-password-dialog-title"
        ref={containerRef}
        className="bg-bg-card border-border-default mx-4 w-full max-w-md rounded-xl border p-6 shadow-2xl"
        onKeyDown={handleFocusTrapKeyDown}
      >
        <h2
          id="initial-password-dialog-title"
          className="text-text-primary mb-2 text-lg font-bold"
        >
          テナントを作成しました
        </h2>
        <p className="text-text-secondary mb-4 text-sm">
          初期管理者アカウントが作成されました。このパスワードは一度しか表示されません。
        </p>

        <div className="mb-4 space-y-3">
          <div>
            <p className="text-text-muted text-xs font-medium">
              メールアドレス
            </p>
            <p className="bg-bg-input border-border-default text-text-primary mt-1 rounded-lg border px-3 py-2 text-sm">
              {email}
            </p>
          </div>

          <div>
            <p className="text-text-muted text-xs font-medium">仮パスワード</p>
            <div className="mt-1 flex items-center gap-2">
              <p className="bg-bg-input border-border-default text-text-primary flex-1 rounded-lg border px-3 py-2 font-mono text-sm break-all">
                {password}
              </p>
              <button
                type="button"
                onClick={() => void handleCopy()}
                className="border-border-default text-text-secondary min-h-[44px] shrink-0 rounded-lg border px-3 py-2 text-xs font-medium transition-opacity hover:opacity-80"
              >
                {copied ? "コピー済み" : "コピー"}
              </button>
            </div>
          </div>
        </div>

        <p className="text-badge-warn-text mb-4 text-xs">
          ※ 初回ログイン時にパスワードの変更が必要です。
        </p>
        {copyError && (
          <p className="bg-badge-error-bg text-badge-error-text mb-4 rounded-lg px-3 py-2 text-xs">
            {copyError}
          </p>
        )}

        <button
          type="button"
          onClick={onClose}
          className="bg-btn-primary-bg text-btn-primary-text min-h-[44px] w-full rounded-lg px-4 py-2 text-sm font-medium transition-opacity hover:opacity-80"
        >
          閉じる
        </button>
      </div>
    </div>
  );
};

export default InitialAdminPasswordModal;
