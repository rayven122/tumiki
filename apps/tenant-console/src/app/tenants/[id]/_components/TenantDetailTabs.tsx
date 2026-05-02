"use client";

import { useState } from "react";
import { type RouterOutputs } from "@/trpc/react";
import TenantLicenseTab from "./TenantLicenseTab";

type Tenant = RouterOutputs["tenant"]["get"];

type Props = {
  tenant: Tenant;
  initialLicenses: RouterOutputs["license"]["list"];
};

type Tab = "overview" | "licenses";

const TenantDetailTabs = ({ tenant, initialLicenses }: Props) => {
  const [activeTab, setActiveTab] = useState<Tab>("overview");

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
          <div className="overflow-hidden rounded-lg bg-white shadow">
            <dl className="divide-y divide-gray-200">
              <div className="px-6 py-4 sm:grid sm:grid-cols-3 sm:gap-4">
                <dt className="text-sm font-medium text-gray-500">Slug</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                  {tenant.slug}
                </dd>
              </div>
              <div className="px-6 py-4 sm:grid sm:grid-cols-3 sm:gap-4">
                <dt className="text-sm font-medium text-gray-500">ドメイン</dt>
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
                <dt className="text-sm font-medium text-gray-500">OIDC種別</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                  {tenant.oidcType}
                </dd>
              </div>
              <div className="px-6 py-4 sm:grid sm:grid-cols-3 sm:gap-4">
                <dt className="text-sm font-medium text-gray-500">作成日時</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                  {tenant.createdAt.toLocaleString("ja-JP")}
                </dd>
              </div>
            </dl>
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
    </div>
  );
};

export default TenantDetailTabs;
