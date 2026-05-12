import type { JSX } from "react";
import { useEffect, useId, useState } from "react";
import { Plug, X } from "lucide-react";
import type { McpConnectionDetailItem } from "../../main/types";

type OAuthReauthModalProps = {
  open: boolean;
  /** OAuth認証タイプのコネクト一覧（authType === "OAUTH" のものだけ渡す） */
  connections: McpConnectionDetailItem[];
  /** 再認証実行中フラグ（処理中はボタンを無効化） */
  isProcessing: boolean;
  onConfirm: (connectionId: number) => void;
  onCancel: () => void;
};

// McpConnectionDetailItem は credentials を露出しないため、
// 認証状態の詳細はサーバーステータスから推測するに留める（精度は将来Issueで改善）。
const resolveTokenBadge = (
  connection: McpConnectionDetailItem,
): { label: string; className: string } =>
  connection.isEnabled
    ? {
        label: "有効",
        className:
          "bg-[var(--badge-success-bg)] text-[var(--badge-success-text)]",
      }
    : {
        label: "無効化",
        className: "bg-[var(--bg-active)] text-[var(--text-muted)]",
      };

export const OAuthReauthModal = ({
  open,
  connections,
  isProcessing,
  onConfirm,
  onCancel,
}: OAuthReauthModalProps): JSX.Element | null => {
  const titleId = useId();
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // モーダルを開くたびに先頭のコネクトを既定選択にする
  useEffect(() => {
    if (open) {
      setSelectedId(connections[0]?.id ?? null);
    }
  }, [open, connections]);

  // Escapeキーで閉じる（WAI-ARIA dialog 仕様）
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === "Escape" && !isProcessing) onCancel();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, isProcessing, onCancel]);

  if (!open) return null;

  const handleConfirm = (): void => {
    if (selectedId === null || isProcessing) return;
    onConfirm(selectedId);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div className="w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5 shadow-[var(--shadow-card)]">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h3
              id={titleId}
              className="text-base font-semibold text-[var(--text-primary)]"
            >
              OAuthを再設定するコネクトを選択
            </h3>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              選択したコネクトのトークンが新しいものに置き換わります。同じ接続元を共有している他のコネクトにも反映されます。
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isProcessing}
            aria-label="閉じる"
            className="rounded-lg p-1 text-[var(--text-muted)] transition hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-primary)] disabled:opacity-50"
          >
            <X size={16} />
          </button>
        </div>

        <div className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
          {connections.length === 0 ? (
            <p className="py-6 text-center text-xs text-[var(--text-subtle)]">
              再認証可能なOAuthコネクトがありません
            </p>
          ) : (
            connections.map((conn) => {
              const isSelected = selectedId === conn.id;
              const badge = resolveTokenBadge(conn);
              return (
                <label
                  key={conn.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 transition ${
                    isSelected
                      ? "border-[var(--accent)] bg-[var(--bg-card-hover)]"
                      : "border-[var(--border-subtle)] bg-[var(--bg-card-hover)]/40 hover:border-[var(--border)]"
                  }`}
                >
                  <input
                    type="radio"
                    name="reauth-connection"
                    value={conn.id}
                    checked={isSelected}
                    onChange={() => setSelectedId(conn.id)}
                    disabled={isProcessing}
                    className="h-3.5 w-3.5 accent-[var(--accent)]"
                  />
                  {conn.catalog?.iconPath ? (
                    <img
                      src={conn.catalog.iconPath}
                      alt=""
                      className="h-7 w-7 shrink-0 rounded"
                    />
                  ) : (
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-[var(--bg-active)]">
                      <Plug size={14} className="text-[var(--text-muted)]" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-medium text-[var(--text-primary)]">
                        {conn.name}
                      </span>
                      <span
                        className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                    </div>
                    <div className="truncate text-[10px] text-[var(--text-muted)]">
                      {conn.url ?? conn.command ?? "—"}
                    </div>
                  </div>
                </label>
              );
            })
          )}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isProcessing}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3.5 py-1.5 text-sm text-[var(--text-secondary)] transition hover:opacity-80 disabled:opacity-50"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={
              selectedId === null || isProcessing || connections.length === 0
            }
            className="rounded-lg bg-[var(--accent)] px-3.5 py-1.5 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isProcessing ? "認証画面を起動中..." : "再認証する"}
          </button>
        </div>
      </div>
    </div>
  );
};
