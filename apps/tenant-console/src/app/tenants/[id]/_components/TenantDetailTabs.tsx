"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { api, type RouterOutputs } from "@/trpc/react";
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

  const deleteTenant = api.tenant.delete.useMutation({
    onSuccess: () => {
      router.push("/tenants");
    },
    onError: (err) => {
      setDeleteError(err.message);
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
    document.addEventListener("keydown", handleKeyDown);
    setTimeout(() => confirmInputRef.current?.focus(), 50);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [showDeleteDialog, handleDeleteClose]);

  return (
    <div>
      {/* タブナビゲーション */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-4">
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={`min-h-[44px] border-b-2 px-4 py-2 text-sm font-medium ${
              activeTab === "overview"
                ? "border-indigo-500 text-indigo-600"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
            }`}
          >
            概要
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("licenses")}
            className={`min-h-[44px] border-b-2 px-4 py-2 text-sm font-medium ${
              activeTab === "licenses"
                ? "border-indigo-500 text-indigo-600"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
            }`}
          >
            ライセンス
          </button>
        </nav>
      </div>

      {/* タブコンテンツ */}
      <div className="mt-6">
        {activeTab === "overview" && (
          <div>
            <div className="overflow-hidden rounded-lg bg-white shadow">
              <dl className="divide-y divide-gray-200">
                <div className="px-6 py-4 sm:grid sm:grid-cols-3 sm:gap-4">
                  <dt className="text-sm font-medium text-gray-500">Slug</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                    {tenant.slug}
                  </dd>
                </div>
                <div className="px-6 py-4 sm:grid sm:grid-cols-3 sm:gap-4">
                  <dt className="text-sm font-medium text-gray-500">
                    ドメイン
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                    {tenant.domain}
                  </dd>
                </div>
                <div className="px-6 py-4 sm:grid sm:grid-cols-3 sm:gap-4">
                  <dt className="text-sm font-medium text-gray-500">
                    ステータス
                  </dt>
                  <dd className="mt-1 sm:col-span-2 sm:mt-0">
                    <span
                      className={`inline-flex rounded-full px-2 text-xs leading-5 font-semibold ${
                        tenant.status === "ACTIVE"
                          ? "bg-green-100 text-green-800"
                          : tenant.status === "ERROR"
                            ? "bg-red-100 text-red-800"
                            : tenant.status === "DELETING"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {tenant.status}
                    </span>
                  </dd>
                </div>
                <div className="px-6 py-4 sm:grid sm:grid-cols-3 sm:gap-4">
                  <dt className="text-sm font-medium text-gray-500">
                    OIDC種別
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                    {tenant.oidcType}
                  </dd>
                </div>
                <div className="px-6 py-4 sm:grid sm:grid-cols-3 sm:gap-4">
                  <dt className="text-sm font-medium text-gray-500">
                    作成日時
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                    {tenant.createdAt.toLocaleString("ja-JP")}
                  </dd>
                </div>
              </dl>
            </div>

            {/* 危険ゾーン */}
            <div className="mt-8 rounded-lg border border-red-200 bg-red-50 p-6">
              <h3 className="mb-1 text-sm font-semibold text-red-800">
                危険ゾーン
              </h3>
              <p className="mb-4 text-sm text-red-700">
                テナントを削除すると、k8s リソース・Helm
                リリースが削除されます。この操作は取り消せません。
              </p>
              <button
                type="button"
                onClick={handleDeleteOpen}
                disabled={
                  tenant.status === "PROVISIONING" ||
                  tenant.status === "DELETING"
                }
                className="min-h-[44px] rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
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

      {/* テナント削除確認ダイアログ */}
      {showDeleteDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={handleDeleteClose}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-dialog-title"
            className="mx-4 w-full max-w-md rounded-lg bg-white p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="delete-dialog-title"
              className="mb-2 text-lg font-semibold text-gray-900"
            >
              テナントを削除しますか？
            </h2>
            <p className="mb-4 text-sm text-gray-600">
              この操作は取り消せません。k8s リソースおよび Helm
              リリースが完全に削除されます。
            </p>
            <p className="mb-2 text-sm font-medium text-gray-700">
              確認のため{" "}
              <span className="font-mono font-bold text-red-600">
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
              className="mb-4 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 focus:outline-none"
            />
            {deleteError && (
              <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
                {deleteError}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={handleDeleteClose}
                disabled={deleteTenant.isPending}
                className="min-h-[44px] rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={() => deleteTenant.mutate({ id: tenant.id })}
                disabled={deleteTenant.isPending || confirmSlug !== tenant.slug}
                className="min-h-[44px] rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
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
