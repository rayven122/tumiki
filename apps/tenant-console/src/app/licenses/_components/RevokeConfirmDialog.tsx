"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/trpc/react";

type Props = {
  licenseId: string;
  subject: string;
  onClose: () => void;
  onRevoked: () => void;
};

const RevokeConfirmDialog = ({
  licenseId,
  subject,
  onClose,
  onRevoked,
}: Props) => {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const utils = api.useUtils();
  const revokeLicense = api.license.revoke.useMutation({
    onSuccess: () => {
      setReason("");
      setError(null);
      void utils.license.list.invalidate();
      onRevoked();
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const handleClose = useCallback(() => {
    setReason("");
    setError(null);
    onClose();
  }, [onClose]);

  // Escape キーでダイアログを閉じる
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleClose]);

  const handleRevoke = () => {
    setError(null);
    revokeLicense.mutate({ id: licenseId, reason: reason || undefined });
  };

  return (
    // オーバーレイクリックで閉じる
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onClick={handleClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="revoke-dialog-title"
        aria-describedby="revoke-dialog-desc"
        className="bg-bg-card border-border-default mx-4 w-full max-w-lg rounded-xl border p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="revoke-dialog-title"
          className="text-text-primary mb-4 text-lg font-semibold"
        >
          ライセンスの失効確認
        </h2>
        <p id="revoke-dialog-desc" className="text-text-secondary mb-4 text-sm">
          ライセンス{" "}
          <span className="text-text-primary font-medium">{subject}</span>{" "}
          を失効させますか？この操作は取り消せません。
        </p>

        <div className="mb-4">
          <label
            htmlFor="revokeReason"
            className="text-text-secondary block text-sm font-medium"
          >
            理由（任意）
          </label>
          <textarea
            id="revokeReason"
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="失効理由を入力（任意）"
            className="bg-bg-input border-border-default text-text-primary placeholder:text-text-subtle mt-1 block w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-white/20"
          />
        </div>

        {error && (
          <div className="bg-badge-error-bg text-badge-error-text mb-4 rounded-lg p-4 text-sm">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={handleClose}
            disabled={revokeLicense.isPending}
            className="border-border-default text-text-secondary rounded-lg border px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-80 disabled:opacity-50"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleRevoke}
            disabled={revokeLicense.isPending}
            className="bg-badge-error-text rounded-lg px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-80 disabled:opacity-50"
          >
            {revokeLicense.isPending ? "失効処理中..." : "失効する"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RevokeConfirmDialog;
