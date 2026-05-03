import type { JSX } from "react";
import { useEffect, useId } from "react";
import { cardStyle } from "../utils/theme-styles";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  confirmDisabled?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export const ConfirmDialog = ({
  open,
  title,
  message,
  confirmLabel = "削除",
  confirmDisabled = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps): JSX.Element | null => {
  const titleId = useId();

  // Escapeキーでダイアログを閉じる（WAI-ARIA dialog仕様）
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    >
      <div className="w-full max-w-sm rounded-xl p-6" style={cardStyle}>
        <h3
          id={titleId}
          className="text-base font-semibold text-[var(--text-primary)]"
        >
          {title}
        </h3>
        <p className="mt-2 text-sm text-[var(--text-muted)]">{message}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-4 py-2 text-sm text-[var(--text-secondary)] transition hover:opacity-80"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={confirmDisabled}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
