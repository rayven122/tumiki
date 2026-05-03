"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/trpc/react";
import {
  AVAILABLE_FEATURES,
  type AvailableFeature,
} from "@/features/licenses/api/schemas";

type Props = {
  tenants: Array<{ id: string; slug: string }>;
  defaultTenantId?: string;
};

type LicenseType = "PERSONAL" | "TENANT";

const IssueLicenseDialog = ({ tenants, defaultTenantId }: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const [issuedToken, setIssuedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [licenseType, setLicenseType] = useState<LicenseType>(
    defaultTenantId ? "TENANT" : "PERSONAL",
  );
  const [subject, setSubject] = useState(defaultTenantId ?? "");
  const [tenantId, setTenantId] = useState(defaultTenantId ?? "");
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
    setLicenseType(defaultTenantId ? "TENANT" : "PERSONAL");
    setSubject(defaultTenantId ?? "");
    setTenantId(defaultTenantId ?? "");
    setFeatures([]);
    setTtlDays(365);
    setPlan("");
    setNotes("");
    setError(null);
  }, [defaultTenantId]);

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
        className="bg-btn-primary-bg text-btn-primary-text rounded-lg px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-80"
      >
        ライセンス発行
      </button>

      {/* モーダル部分のみ isOpen で制御。オーバーレイクリックで閉じる */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
          onClick={handleClose}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="issue-dialog-title"
            aria-describedby={issuedToken ? "issue-complete-desc" : undefined}
            className="bg-bg-card border-border-default mx-4 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 発行完了画面 */}
            {issuedToken ? (
              <div>
                <h2
                  id="issue-dialog-title"
                  className="text-text-primary mb-4 text-lg font-semibold"
                >
                  ライセンス発行完了
                </h2>
                <div
                  id="issue-complete-desc"
                  className="bg-badge-warn-bg text-badge-warn-text mb-4 rounded-lg p-4 text-sm"
                >
                  このトークンは再表示できません。必ずコピーしてください。
                </div>
                <div className="mb-4">
                  <p className="text-text-secondary mb-1 text-sm font-medium">
                    ライセンストークン
                  </p>
                  <div className="bg-bg-input border-border-default text-text-primary rounded-lg border p-3 font-mono text-sm break-all">
                    {issuedToken}
                  </div>
                </div>
                {error && (
                  <div className="bg-badge-error-bg text-badge-error-text mb-4 rounded-lg p-4 text-sm">
                    {error}
                  </div>
                )}
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => void handleCopyToken()}
                    className="border-border-default text-text-secondary rounded-lg border px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-80"
                  >
                    {copied ? "コピー済み ✓" : "コピー"}
                  </button>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="bg-btn-primary-bg text-btn-primary-text rounded-lg px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-80"
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
                  className="text-text-primary mb-4 text-lg font-semibold"
                >
                  ライセンス発行
                </h2>

                {/* 種別（テナント固定の場合は非表示） */}
                {!defaultTenantId && (
                  <div className="mb-4">
                    <label className="text-text-secondary block text-sm font-medium">
                      種別 <span className="text-badge-error-text">*</span>
                    </label>
                    <div className="mt-2 flex gap-4">
                      <label className="flex min-h-[36px] items-center">
                        <input
                          type="radio"
                          value="PERSONAL"
                          checked={licenseType === "PERSONAL"}
                          onChange={() => setLicenseType("PERSONAL")}
                          className="mr-2"
                        />
                        <span className="text-text-secondary text-sm">
                          PERSONAL
                        </span>
                      </label>
                      <label className="flex min-h-[36px] items-center">
                        <input
                          type="radio"
                          value="TENANT"
                          checked={licenseType === "TENANT"}
                          onChange={() => setLicenseType("TENANT")}
                          className="mr-2"
                        />
                        <span className="text-text-secondary text-sm">
                          TENANT
                        </span>
                      </label>
                    </div>
                  </div>
                )}

                {/* Subject */}
                <div className="mb-4">
                  <label
                    htmlFor="subject"
                    className="text-text-secondary block text-sm font-medium"
                  >
                    Subject <span className="text-badge-error-text">*</span>
                  </label>
                  {licenseType === "PERSONAL" ? (
                    <input
                      id="subject"
                      type="email"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      required
                      placeholder="user@example.com"
                      className="bg-bg-input border-border-default text-text-primary placeholder:text-text-subtle mt-1 block w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-white/20"
                    />
                  ) : (
                    <select
                      id="subject"
                      value={tenantId}
                      onChange={(e) => handleTenantSelect(e.target.value)}
                      required
                      className="bg-bg-input border-border-default text-text-primary mt-1 block w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-white/20"
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
                  <label className="text-text-secondary block text-sm font-medium">
                    Features <span className="text-badge-error-text">*</span>
                  </label>
                  <div className="mt-2 space-y-2">
                    {AVAILABLE_FEATURES.map((feature) => (
                      <label
                        key={feature}
                        className="flex min-h-[36px] items-center"
                      >
                        <input
                          type="checkbox"
                          checked={features.includes(feature)}
                          onChange={() => handleFeatureToggle(feature)}
                          className="mr-2"
                        />
                        <span className="text-text-secondary text-sm">
                          {feature}
                        </span>
                      </label>
                    ))}
                  </div>
                  {features.length === 0 && (
                    <p className="text-text-muted mt-1 text-xs">
                      1つ以上選択してください
                    </p>
                  )}
                </div>

                {/* 有効期限（日数） */}
                <div className="mb-4">
                  <label
                    htmlFor="ttlDays"
                    className="text-text-secondary block text-sm font-medium"
                  >
                    有効期限（日数）{" "}
                    <span className="text-badge-error-text">*</span>
                  </label>
                  <input
                    id="ttlDays"
                    type="number"
                    value={ttlDays}
                    onChange={(e) => setTtlDays(Number(e.target.value))}
                    min={1}
                    max={730}
                    required
                    className="bg-bg-input border-border-default text-text-primary mt-1 block w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-white/20"
                  />
                </div>

                {/* プラン */}
                <div className="mb-4">
                  <label
                    htmlFor="plan"
                    className="text-text-secondary block text-sm font-medium"
                  >
                    プラン（任意）
                  </label>
                  <input
                    id="plan"
                    type="text"
                    value={plan}
                    onChange={(e) => setPlan(e.target.value)}
                    className="bg-bg-input border-border-default text-text-primary mt-1 block w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-white/20"
                  />
                </div>

                {/* メモ */}
                <div className="mb-4">
                  <label
                    htmlFor="notes"
                    className="text-text-secondary block text-sm font-medium"
                  >
                    メモ（任意）
                  </label>
                  <textarea
                    id="notes"
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="bg-bg-input border-border-default text-text-primary mt-1 block w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-white/20"
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
                    disabled={issueLicense.isPending}
                    className="border-border-default text-text-secondary rounded-lg border px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-80 disabled:opacity-50"
                  >
                    キャンセル
                  </button>
                  <button
                    type="submit"
                    disabled={issueLicense.isPending || features.length === 0}
                    className="bg-btn-primary-bg text-btn-primary-text rounded-lg px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-80 disabled:opacity-50"
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
