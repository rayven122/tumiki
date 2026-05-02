"use client";

import { useEffect, useState } from "react";
import { api } from "@/trpc/react";

type Props = {
  licenseId: string;
  subject: string;
  isOpen: boolean;
  onClose: () => void;
  onRevoked: () => void;
};

const RevokeConfirmDialog = ({
  licenseId,
  subject,
  isOpen,
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

  // Escape キーでダイアログを閉じる
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const handleRevoke = () => {
    setError(null);
    revokeLicense.mutate({ id: licenseId, reason: reason || undefined });
  };

  const handleClose = () => {
    setReason("");
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    // オーバーレイクリックで閉じる
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={handleClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="revoke-dialog-title"
        className="mx-4 w-full max-w-lg rounded-lg bg-white p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="revoke-dialog-title"
          className="mb-4 text-lg font-semibold text-gray-900"
        >
          ライセンスの失効確認
        </h2>
        <p className="mb-4 text-sm text-gray-700">
          ライセンス{" "}
          <span className="font-medium text-gray-900">{subject}</span>{" "}
          を失効させますか？この操作は取り消せません。
        </p>

        <div className="mb-4">
          <label
            htmlFor="revokeReason"
            className="block text-sm font-medium text-gray-700"
          >
            理由（任意）
          </label>
          <textarea
            id="revokeReason"
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="失効理由を入力（任意）"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
          />
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={handleClose}
            disabled={revokeLicense.isPending}
            className="min-h-[44px] rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleRevoke}
            disabled={revokeLicense.isPending}
            className="min-h-[44px] rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {revokeLicense.isPending ? "失効処理中..." : "失効する"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RevokeConfirmDialog;
