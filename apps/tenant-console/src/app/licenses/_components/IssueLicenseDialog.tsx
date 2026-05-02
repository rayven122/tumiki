"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/trpc/react";
import {
  AVAILABLE_FEATURES,
  type AvailableFeature,
} from "@/features/licenses/api/schemas";

type Props = {
  tenants: Array<{ id: string; slug: string }>;
};

type LicenseType = "PERSONAL" | "TENANT";

const IssueLicenseDialog = ({ tenants }: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const [issuedToken, setIssuedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [licenseType, setLicenseType] = useState<LicenseType>("PERSONAL");
  const [subject, setSubject] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [features, setFeatures] = useState<AvailableFeature[]>([]);
  const [ttlDays, setTtlDays] = useState(365);
  const [plan, setPlan] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const utils = api.useUtils();
  const issueLicense = api.license.issue.useMutation({
    onSuccess: (data) => {
      setIssuedToken(data.token);
      setError(null);
      void utils.license.list.invalidate();
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const resetForm = useCallback(() => {
    setIssuedToken(null);
    setLicenseType("PERSONAL");
    setSubject("");
    setTenantId("");
    setFeatures([]);
    setTtlDays(365);
    setPlan("");
    setNotes("");
    setError(null);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    resetForm();
  }, [resetForm]);

  const handleOpen = useCallback(() => {
    setIsOpen(true);
    resetForm();
  }, [resetForm]);

  // Escape キーでダイアログを閉じる
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleClose]);

  // コピータイマーのクリーンアップ
  useEffect(() => {
    return () => {
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
    };
  }, []);

  const handleFeatureToggle = (feature: AvailableFeature) => {
    setFeatures((prev) =>
      prev.includes(feature)
        ? prev.filter((f) => f !== feature)
        : [...prev, feature],
    );
  };

  // TENANT タイプでテナント選択時に subject と tenantId を同値にセット
  const handleTenantSelect = (id: string) => {
    setTenantId(id);
    setSubject(id);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (licenseType === "PERSONAL") {
      issueLicense.mutate({
        type: "PERSONAL",
        subject,
        features,
        ttlDays,
        plan: plan || undefined,
        notes: notes || undefined,
      });
    } else {
      issueLicense.mutate({
        type: "TENANT",
        subject: tenantId,
        tenantId,
        features,
        ttlDays,
        plan: plan || undefined,
        notes: notes || undefined,
      });
    }
  };

  const handleCopyToken = async () => {
    if (!issuedToken) return;
    try {
      await navigator.clipboard.writeText(issuedToken);
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
      setCopied(true);
      copiedTimerRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      setError(
        "クリップボードへのコピーに失敗しました。手動でコピーしてください。",
      );
    }
  };

  return (
    <>
      {/* トリガーボタンは常に表示（isOpen に関わらず） */}
      <button
        type="button"
        onClick={handleOpen}
        className="min-h-[44px] rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none"
      >
        ライセンス発行
      </button>

      {/* モーダル部分のみ isOpen で制御。オーバーレイクリックで閉じる */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={handleClose}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="issue-dialog-title"
            aria-describedby={issuedToken ? "issue-complete-desc" : undefined}
            className="mx-4 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 発行完了画面 */}
            {issuedToken ? (
              <div>
                <h2
                  id="issue-dialog-title"
                  className="mb-4 text-lg font-semibold text-gray-900"
                >
                  ライセンス発行完了
                </h2>
                <div
                  id="issue-complete-desc"
                  className="mb-4 rounded-md bg-amber-50 p-4 text-sm text-amber-700"
                >
                  このトークンは再表示できません。必ずコピーしてください。
                </div>
                <div className="mb-4">
                  <p className="mb-1 text-sm font-medium text-gray-700">
                    ライセンストークン
                  </p>
                  <div className="rounded bg-gray-100 p-3 font-mono text-sm break-all text-gray-900">
                    {issuedToken}
                  </div>
                </div>
                {error && (
                  <div className="mb-4 rounded-md bg-red-50 p-4 text-sm text-red-700">
                    {error}
                  </div>
                )}
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => void handleCopyToken()}
                    className="min-h-[44px] rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    {copied ? "コピー済み ✓" : "コピー"}
                  </button>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="min-h-[44px] rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                  >
                    閉じる
                  </button>
                </div>
              </div>
            ) : (
              /* 発行フォーム */
              <form onSubmit={handleSubmit}>
                <h2
                  id="issue-dialog-title"
                  className="mb-4 text-lg font-semibold text-gray-900"
                >
                  ライセンス発行
                </h2>

                {/* 種別 */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700">
                    種別 <span className="text-red-500">*</span>
                  </label>
                  <div className="mt-2 flex gap-4">
                    <label className="flex min-h-[44px] items-center">
                      <input
                        type="radio"
                        value="PERSONAL"
                        checked={licenseType === "PERSONAL"}
                        onChange={() => setLicenseType("PERSONAL")}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">PERSONAL</span>
                    </label>
                    <label className="flex min-h-[44px] items-center">
                      <input
                        type="radio"
                        value="TENANT"
                        checked={licenseType === "TENANT"}
                        onChange={() => setLicenseType("TENANT")}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">TENANT</span>
                    </label>
                  </div>
                </div>

                {/* Subject */}
                <div className="mb-4">
                  <label
                    htmlFor="subject"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Subject <span className="text-red-500">*</span>
                  </label>
                  {licenseType === "PERSONAL" ? (
                    <input
                      id="subject"
                      type="email"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      required
                      placeholder="user@example.com"
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    />
                  ) : (
                    <select
                      id="subject"
                      value={tenantId}
                      onChange={(e) => handleTenantSelect(e.target.value)}
                      required
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    >
                      <option value="">テナントを選択</option>
                      {tenants.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.slug}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Features */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700">
                    Features <span className="text-red-500">*</span>
                  </label>
                  <div className="mt-2 space-y-2">
                    {AVAILABLE_FEATURES.map((feature) => (
                      <label
                        key={feature}
                        className="flex min-h-[44px] items-center"
                      >
                        <input
                          type="checkbox"
                          checked={features.includes(feature)}
                          onChange={() => handleFeatureToggle(feature)}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700">{feature}</span>
                      </label>
                    ))}
                  </div>
                  {features.length === 0 && (
                    <p className="mt-1 text-xs text-gray-500">
                      1つ以上選択してください
                    </p>
                  )}
                </div>

                {/* 有効期限（日数） */}
                <div className="mb-4">
                  <label
                    htmlFor="ttlDays"
                    className="block text-sm font-medium text-gray-700"
                  >
                    有効期限（日数） <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="ttlDays"
                    type="number"
                    value={ttlDays}
                    onChange={(e) => setTtlDays(Number(e.target.value))}
                    min={1}
                    max={730}
                    required
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                {/* プラン */}
                <div className="mb-4">
                  <label
                    htmlFor="plan"
                    className="block text-sm font-medium text-gray-700"
                  >
                    プラン（任意）
                  </label>
                  <input
                    id="plan"
                    type="text"
                    value={plan}
                    onChange={(e) => setPlan(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                {/* メモ */}
                <div className="mb-4">
                  <label
                    htmlFor="notes"
                    className="block text-sm font-medium text-gray-700"
                  >
                    メモ（任意）
                  </label>
                  <textarea
                    id="notes"
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
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
                    disabled={issueLicense.isPending}
                    className="min-h-[44px] rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    キャンセル
                  </button>
                  <button
                    type="submit"
                    disabled={issueLicense.isPending || features.length === 0}
                    className="min-h-[44px] rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {issueLicense.isPending ? "発行中..." : "発行"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default IssueLicenseDialog;
