"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { api, type RouterOutputs } from "@/trpc/react";
import { tenantStatusBadgeClass } from "@/app/tenants/_components/tenantStyles";
import TenantLicenseTab from "./TenantLicenseTab";

type Tenant = RouterOutputs["tenant"]["get"];

type Props = {
  tenant: Tenant;
  initialLicenses: RouterOutputs["license"]["list"];
};

type Tab = "overview" | "licenses";

const TenantDetailTabs = ({ tenant, initialLicenses }: Props) => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const confirmInputRef = useRef<HTMLInputElement>(null);
  const [confirmSlug, setConfirmSlug] = useState("");

  const [upgradeError, setUpgradeError] = useState<string | null>(null);

  const deleteTenant = api.tenant.delete.useMutation({
    onSuccess: () => {
      router.push("/tenants");
    },
    onError: (err) => {
      setDeleteError(err.message);
    },
  });

  const upgradeTenant = api.tenant.upgrade.useMutation({
    onSuccess: () => {
      setUpgradeError(null);
      router.refresh();
    },
    onError: (err) => {
      setUpgradeError(err.message);
    },
  });

  const handleDeleteOpen = useCallback(() => {
    setConfirmSlug("");
    setDeleteError(null);
    setShowDeleteDialog(true);
  }, []);

  const handleDeleteClose = useCallback(() => {
    setShowDeleteDialog(false);
    setConfirmSlug("");
    setDeleteError(null);
  }, []);

  useEffect(() => {
    if (!showDeleteDialog) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleDeleteClose();
    };
    const focusTimer = setTimeout(() => confirmInputRef.current?.focus(), 50);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      clearTimeout(focusTimer);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [showDeleteDialog, handleDeleteClose]);

  return (
    <div>
      <div className="border-b-border-default border-b">
        <nav className="-mb-px flex gap-4">
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={`border-b-2 px-3 py-2 text-xs font-medium ${
              activeTab === "overview"
                ? "border-text-primary text-text-primary"
                : "text-text-muted hover:text-text-secondary border-transparent"
            }`}
          >
            概要
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("licenses")}
            className={`border-b-2 px-3 py-2 text-xs font-medium ${
              activeTab === "licenses"
                ? "border-text-primary text-text-primary"
                : "text-text-muted hover:text-text-secondary border-transparent"
            }`}
          >
            ライセンス
          </button>
        </nav>
      </div>

      <div className="mt-6">
        {activeTab === "overview" && (
          <div>
            <div className="bg-bg-card border-border-default overflow-hidden rounded-xl border">
              <dl className="divide-border-subtle divide-y">
                <div className="px-5 py-3 sm:grid sm:grid-cols-3 sm:gap-4">
                  <dt className="text-text-muted text-xs font-medium">Slug</dt>
                  <dd className="text-text-primary mt-1 font-mono text-sm sm:col-span-2 sm:mt-0">
                    {tenant.slug}
                  </dd>
                </div>
                <div className="px-5 py-3 sm:grid sm:grid-cols-3 sm:gap-4">
                  <dt className="text-text-muted text-xs font-medium">
                    ドメイン
                  </dt>
                  <dd className="text-text-secondary mt-1 text-sm sm:col-span-2 sm:mt-0">
                    {tenant.domain}
                  </dd>
                </div>
                <div className="px-5 py-3 sm:grid sm:grid-cols-3 sm:gap-4">
                  <dt className="text-text-muted text-xs font-medium">
                    ステータス
                  </dt>
                  <dd className="mt-1 sm:col-span-2 sm:mt-0">
                    <span
                      className={`inline-flex rounded-full px-2 text-xs leading-5 font-semibold ${tenantStatusBadgeClass(tenant.status)}`}
                    >
                      {tenant.status}
                    </span>
                  </dd>
                </div>
                <div className="px-5 py-3 sm:grid sm:grid-cols-3 sm:gap-4">
                  <dt className="text-text-muted text-xs font-medium">
                    OIDC種別
                  </dt>
                  <dd className="text-text-secondary mt-1 font-mono text-sm sm:col-span-2 sm:mt-0">
                    {tenant.oidcType}
                  </dd>
                </div>
                <div className="px-5 py-3 sm:grid sm:grid-cols-3 sm:gap-4">
                  <dt className="text-text-muted text-xs font-medium">
                    作成日時
                  </dt>
                  <dd className="text-text-secondary mt-1 font-mono text-sm sm:col-span-2 sm:mt-0">
                    {tenant.createdAt.toLocaleString("ja-JP")}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="border-border-default bg-bg-card mt-8 rounded-xl border p-5">
              <h3 className="text-text-primary mb-1 text-sm font-semibold">
                イメージ更新
              </h3>
              <p className="text-text-secondary mb-4 text-sm">
                internal-manager を最新イメージにアップグレードします。
              </p>
              {upgradeError && (
                <div className="bg-badge-error-bg text-badge-error-text mb-4 rounded-lg p-3 text-sm">
                  {upgradeError}
                </div>
              )}
              <button
                type="button"
                onClick={() => upgradeTenant.mutate({ id: tenant.id })}
                disabled={tenant.status !== "ACTIVE" || upgradeTenant.isPending}
                className="bg-btn-primary-bg text-btn-primary-text rounded-lg px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-80 disabled:opacity-50"
              >
                {upgradeTenant.isPending ? "更新中..." : "今すぐ更新"}
              </button>
            </div>

            <div className="bg-badge-error-bg border-border-default mt-8 rounded-xl border p-5">
              <h3 className="text-badge-error-text mb-1 text-sm font-semibold">
                危険ゾーン
              </h3>
              <p className="text-text-secondary mb-4 text-sm">
                テナントを削除すると、k8s リソース・Helm
                リリースが削除されます。この操作は取り消せません。
              </p>
              <button
                type="button"
                onClick={handleDeleteOpen}
                disabled={
                  tenant.status === "PROVISIONING" ||
                  tenant.status === "DELETING" ||
                  tenant.status === "UPGRADING"
                }
                className="bg-badge-error-text rounded-lg px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-80 disabled:opacity-50"
              >
                テナントを削除
              </button>
            </div>
          </div>
        )}

        {activeTab === "licenses" && (
          <TenantLicenseTab
            tenantId={tenant.id}
            tenantSlug={tenant.slug}
            initialData={initialLicenses}
          />
        )}
      </div>

      {showDeleteDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
          onClick={handleDeleteClose}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-dialog-title"
            className="bg-bg-card border-border-default mx-4 w-full max-w-md rounded-xl border p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="delete-dialog-title"
              className="text-text-primary mb-2 text-lg font-semibold"
            >
              テナントを削除しますか？
            </h2>
            <p className="text-text-secondary mb-4 text-sm">
              この操作は取り消せません。k8s リソースおよび Helm
              リリースが完全に削除されます。
            </p>
            <p className="text-text-secondary mb-2 text-sm font-medium">
              確認のため{" "}
              <span className="text-badge-error-text font-mono font-bold">
                {tenant.slug}
              </span>{" "}
              と入力してください
            </p>
            <input
              ref={confirmInputRef}
              type="text"
              value={confirmSlug}
              onChange={(e) => setConfirmSlug(e.target.value)}
              placeholder={tenant.slug}
              className="bg-bg-input border-border-default text-text-primary placeholder:text-text-subtle focus:border-border-focus mb-4 block w-full rounded-lg border px-3 py-2 text-sm outline-none"
            />
            {deleteError && (
              <div className="bg-badge-error-bg text-badge-error-text mb-4 rounded-lg p-3 text-sm">
                {deleteError}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={handleDeleteClose}
                disabled={deleteTenant.isPending}
                className="border-border-default text-text-secondary rounded-lg border px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-80 disabled:opacity-50"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={() => deleteTenant.mutate({ id: tenant.id })}
                disabled={deleteTenant.isPending || confirmSlug !== tenant.slug}
                className="bg-badge-error-text rounded-lg px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-80 disabled:opacity-50"
              >
                {deleteTenant.isPending ? "削除中..." : "削除する"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TenantDetailTabs;
