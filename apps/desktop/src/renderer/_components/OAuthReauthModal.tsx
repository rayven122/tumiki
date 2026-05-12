import type { JSX } from "react";
import { useEffect, useId, useState } from "react";
import { Plug, X, KeyRound } from "lucide-react";
import type { McpConnectionDetailItem } from "../../main/types";

type OAuthReauthModalProps = {
  open: boolean;
  /** OAuth認証タイプのコネクト一覧（authType === "OAUTH" のものだけ渡す） */
  connections: McpConnectionDetailItem[];
  /** 再認証実行中フラグ（処理中はボタンを無効化） */
  isProcessing: boolean;
  /**
   * 既定で選択しておきたいコネクトID。
   * ディープリンク経由で開かれた場合や、リスト中に needsReauth のコネクトがあれば
   * 呼び出し側がそれを指定する想定。指定が無ければ「needsReauth → 先頭」の優先順で自動選択。
   */
  initialSelectedId?: number | null;
  onConfirm: (connectionId: number) => void;
  onCancel: () => void;
};

export const OAuthReauthModal = ({
  open,
  connections,
  isProcessing,
  initialSelectedId = null,
  onConfirm,
  onCancel,
}: OAuthReauthModalProps): JSX.Element | null => {
  const titleId = useId();
  const descId = useId();
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // モーダルを開くたびに初期選択を決定する:
  // 1. 呼び出し側が initialSelectedId を指定していて、それが connections に含まれる → それを使う
  // 2. needsReauth のコネクトがあれば最優先
  // 3. それ以外は先頭
  useEffect(() => {
    if (!open) return;
    if (
      initialSelectedId !== null &&
      connections.some((c) => c.id === initialSelectedId)
    ) {
      setSelectedId(initialSelectedId);
      return;
    }
    const needsReauthFirst = connections.find((c) => c.needsReauth);
    setSelectedId((needsReauthFirst ?? connections[0])?.id ?? null);
  }, [open, connections, initialSelectedId]);

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
      aria-describedby={descId}
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
            <p id={descId} className="mt-1 text-xs text-[var(--text-muted)]">
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
                      {conn.needsReauth && (
                        <span className="flex shrink-0 items-center gap-0.5 rounded bg-red-400/15 px-1.5 py-0.5 text-[9px] font-medium text-red-300">
                          <KeyRound size={9} />
                          要再認証
                        </span>
                      )}
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
