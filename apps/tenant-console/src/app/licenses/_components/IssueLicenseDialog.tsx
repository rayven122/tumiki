"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { type AvailableFeature } from "@/features/licenses/api/schemas";

type Props = {
  tenants: Array<{ id: string; slug: string }>;
  onSuccess?: () => void;
};

type LicenseType = "PERSONAL" | "TENANT";

const IssueLicenseDialog = ({ tenants, onSuccess }: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  // 発行完了後にトークンを保持する state
  const [issuedToken, setIssuedToken] = useState<string | null>(null);

  // フォームの state
  const [licenseType, setLicenseType] = useState<LicenseType>("PERSONAL");
  const [subject, setSubject] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [features, setFeatures] = useState<AvailableFeature[]>([]);
  const [ttlDays, setTtlDays] = useState(365);
  const [plan, setPlan] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const issueLicense = api.license.issue.useMutation({
    onSuccess: (data) => {
      setIssuedToken(data.token);
      setError(null);
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const handleOpen = () => {
    setIsOpen(true);
    setIssuedToken(null);
    resetForm();
  };

  const handleClose = () => {
    setIsOpen(false);
    setIssuedToken(null);
    resetForm();
    onSuccess?.();
  };

  const resetForm = () => {
    setLicenseType("PERSONAL");
    setSubject("");
    setTenantId("");
    setFeatures([]);
    setTtlDays(365);
    setPlan("");
    setNotes("");
    setError(null);
  };

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

  const handleCopyToken = () => {
    if (issuedToken) {
      void navigator.clipboard.writeText(issuedToken);
    }
  };

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={handleOpen}
        className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none"
      >
        ライセンス発行
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none"
      >
        ライセンス発行
      </button>

      <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black">
        <div className="mx-4 w-full max-w-lg rounded-lg bg-white p-6">
          {/* 発行完了画面 */}
          {issuedToken ? (
            <div>
              <h2 className="mb-4 text-lg font-semibold text-gray-900">
                ライセンス発行完了
              </h2>
              <div className="mb-4 rounded-md bg-amber-50 p-4 text-sm text-amber-700">
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
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleCopyToken}
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  コピー
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                >
                  閉じる
                </button>
              </div>
            </div>
          ) : (
            /* 発行フォーム */
            <form onSubmit={handleSubmit}>
              <h2 className="mb-4 text-lg font-semibold text-gray-900">
                ライセンス発行
              </h2>

              {/* 種別 */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">
                  種別 <span className="text-red-500">*</span>
                </label>
                <div className="mt-2 flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="PERSONAL"
                      checked={licenseType === "PERSONAL"}
                      onChange={() => setLicenseType("PERSONAL")}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">PERSONAL</span>
                  </label>
                  <label className="flex items-center">
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
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={features.includes("dynamic-search")}
                      onChange={() => handleFeatureToggle("dynamic-search")}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">
                      dynamic-search
                    </span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={features.includes("pii-dashboard")}
                      onChange={() => handleFeatureToggle("pii-dashboard")}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">pii-dashboard</span>
                  </label>
                </div>
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
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={issueLicense.isPending || features.length === 0}
                  className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {issueLicense.isPending ? "発行中..." : "発行"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
};

export default IssueLicenseDialog;
