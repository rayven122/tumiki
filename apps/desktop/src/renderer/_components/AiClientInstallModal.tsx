import type { JSX } from "react";
import { useState, useRef, useEffect } from "react";
import { X, Copy, Check, Info } from "lucide-react";
import { toast } from "./Toast";

export type AiClientInfo = {
  id: string;
  name: string;
  /** ロゴ参照（テーマ別）。無い場合は頭文字プレースホルダ */
  logoPath?: (theme: string) => string;
};

type Props = {
  client: AiClientInfo;
  serverName: string;
  /** AI クライアント向けに貼り付ける JSON 設定スニペット */
  configSnippet: string;
  /** 設定ファイルのパス表示（ユーザー向け案内） */
  targetPath: string;
  theme: string;
  onClose: () => void;
};

export const AiClientInstallModal = ({
  client,
  serverName,
  configSnippet,
  targetPath,
  theme,
  onClose,
}: Props): JSX.Element => {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  // Escape キーでモーダルを閉じる（キーボードユーザーのアクセシビリティ対応）
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleCopy = () => {
    void navigator.clipboard.writeText(configSnippet).then(() => {
      setCopied(true);
      timerRef.current = setTimeout(() => setCopied(false), 1500);
    });
  };

  const handleInstall = () => {
    // Phase 2: 各 AI クライアント設定ファイルへの自動書き込み（未実装）
    toast.success("設定ファイルへの自動書き込みは近日対応予定");
    onClose();
  };

  const logo = client.logoPath?.(theme);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* タイトル */}
        <div className="mb-5 flex items-start justify-between">
          <div className="flex items-center gap-3">
            {logo ? (
              <img
                src={logo}
                alt={client.name}
                className="h-9 w-9 rounded-lg"
              />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--bg-active)] text-sm font-bold text-[var(--text-muted)]">
                {client.name.charAt(0)}
              </div>
            )}
            <div>
              <h2 className="text-lg font-bold text-[var(--text-primary)]">
                {client.name}に接続
              </h2>
              <p className="text-xs text-[var(--text-muted)]">
                「{serverName}」を追加します
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-[var(--text-muted)] transition hover:opacity-70"
            aria-label="閉じる"
          >
            <X size={20} />
          </button>
        </div>

        {/* 設定ファイルパス */}
        <div className="mb-4">
          <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-[var(--text-primary)]">
            <Info size={12} className="text-[var(--text-subtle)]" />
            設定ファイル
          </div>
          <code className="block rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-app)] px-3 py-2 font-mono text-[11px] break-all text-[var(--text-secondary)]">
            {targetPath}
          </code>
        </div>

        {/* 設定スニペット */}
        <div className="mb-5">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-xs font-medium text-[var(--text-primary)]">
              設定内容
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1 rounded px-2 py-1 text-[10px] text-[var(--text-muted)] transition hover:text-[var(--text-primary)]"
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? "コピー済み" : "コピー"}
            </button>
          </div>
          <pre className="max-h-48 overflow-auto rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-app)] p-3 font-mono text-[11px] leading-relaxed text-[var(--text-secondary)]">
            {configSnippet}
          </pre>
        </div>

        {/* 区切り */}
        <div className="mb-5 border-t border-[var(--border)]" />

        {/* ボタン */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[var(--border)] px-5 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition hover:opacity-80"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleInstall}
            className="rounded-lg bg-[var(--text-primary)] px-6 py-2.5 text-sm font-medium text-[var(--bg-card)] transition hover:opacity-90"
          >
            追加
          </button>
        </div>
      </div>
    </div>
  );
};
