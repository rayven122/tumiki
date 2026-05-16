import type { JSX } from "react";
import { useEffect, useId, useState } from "react";
import { Plug, X, AlertTriangle } from "lucide-react";
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

export const OAuthReauthModal = ({
  open,
  connections,
  isProcessing,
  onConfirm,
  onCancel,
}: OAuthReauthModalProps): JSX.Element | null => {
  const titleId = useId();
  const descId = useId();
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // モーダルを開くたびに、needsReauth=true のコネクトを優先して既定選択にする
  // （ユーザーがまさに直したいのは失効しているコネクトなので、先頭固定より失効優先の方がUI操作を一手減らせる）
  useEffect(() => {
    if (open) {
      const needsReauth = connections.find((conn) => conn.needsReauth);
      setSelectedId(needsReauth?.id ?? connections[0]?.id ?? null);
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
      aria-describedby={descId}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-5 shadow-xl dark:border-white/[.08] dark:bg-zinc-900">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h3
              id={titleId}
              className="text-base font-semibold text-gray-900 dark:text-white"
            >
              OAuthを再設定するコネクトを選択
            </h3>
            <p
              id={descId}
              className="mt-1 text-xs text-gray-500 dark:text-zinc-500"
            >
              選択したコネクトのトークンが新しいものに置き換わります。同じ接続元を共有している他のコネクトにも反映されます。
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isProcessing}
            aria-label="閉じる"
            className="rounded-lg p-1 text-gray-500 transition hover:bg-black/[.02] hover:text-gray-900 disabled:opacity-50 dark:text-zinc-500 dark:hover:bg-white/[.04] dark:hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        <div className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
          {connections.length === 0 ? (
            <p className="py-6 text-center text-xs text-gray-400 dark:text-zinc-600">
              再認証可能なOAuthコネクトがありません
            </p>
          ) : (
            connections.map((conn) => {
              const isSelected = selectedId === conn.id;
              // needsReauth は失効済みコネクトを赤枠で強調する
              const borderClass = conn.needsReauth
                ? isSelected
                  ? "border-red-500 bg-red-500/10 dark:border-red-400 dark:bg-red-500/10"
                  : "border-red-400/50 bg-red-500/5 hover:border-red-500 dark:border-red-400/40 dark:bg-red-500/5"
                : isSelected
                  ? "border-emerald-500 bg-black/[.02] dark:border-emerald-400 dark:bg-white/[.04]"
                  : "border-gray-100 bg-black/[.01] hover:border-gray-200 dark:border-white/[.03] dark:bg-white/[.02] dark:hover:border-white/[.08]";
              return (
                <label
                  key={conn.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 transition ${borderClass}`}
                >
                  <input
                    type="radio"
                    name="reauth-connection"
                    value={conn.id}
                    checked={isSelected}
                    onChange={() => setSelectedId(conn.id)}
                    disabled={isProcessing}
                    className={`h-3.5 w-3.5 ${conn.needsReauth ? "accent-red-500 dark:accent-red-400" : "accent-emerald-500 dark:accent-emerald-400"}`}
                  />
                  {conn.catalog?.iconPath ? (
                    <img
                      src={conn.catalog.iconPath}
                      alt=""
                      className="h-7 w-7 shrink-0 rounded"
                    />
                  ) : (
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-black/[.06] dark:bg-white/[.08]">
                      <Plug
                        size={14}
                        className="text-gray-500 dark:text-zinc-500"
                      />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-medium text-gray-900 dark:text-white">
                        {conn.name}
                      </span>
                      {conn.needsReauth && (
                        <span
                          className="inline-flex shrink-0 items-center gap-0.5 rounded bg-red-500/15 px-1.5 py-0.5 text-[9px] font-medium text-red-500 dark:text-red-400"
                          title="リフレッシュトークンが失効しているため再認証が必要です"
                        >
                          <AlertTriangle size={9} aria-hidden="true" />
                          再認証が必要
                        </span>
                      )}
                    </div>
                    <div className="truncate text-[10px] text-gray-500 dark:text-zinc-500">
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
            className="rounded-lg border border-gray-200 bg-white px-3.5 py-1.5 text-sm text-gray-600 transition hover:opacity-80 disabled:opacity-50 dark:border-white/[.08] dark:bg-zinc-900 dark:text-zinc-400"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={
              selectedId === null || isProcessing || connections.length === 0
            }
            className="rounded-lg bg-emerald-600 px-3.5 py-1.5 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-emerald-500"
          >
            {isProcessing ? "認証画面を起動中..." : "再認証する"}
          </button>
        </div>
      </div>
    </div>
  );
};
